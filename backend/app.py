import os
import json
import asyncio
import psutil
import platform
import requests
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Request, Query, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, Literal
from llama_cpp import Llama
from sse_starlette.sse import EventSourceResponse
from contextlib import asynccontextmanager
import uuid
import logging
import traceback
from rag import (
    RAGSystem as RagSystem, RagQuery, RagResponse, RagCollection, RagDocument,
    get_rag_system, Document, Chroma, VECTORS_DIR
)
import mimetypes
from turbosearch import TurboSearch, SearchQuery as TsSearchQuery, SearchResponse as TsSearchResponse
import re
from quiz_manager import QuizManager
from models import Quiz, QuizQuestion, QuizAttempt, QuizResult, QuizGenerationRequest, StudentProgressReport

# Configuration
MODEL_PATH = os.environ.get("MODEL_PATH", "models/DISABLED_Meta-Llama-3.1-8B-Instruct.Q4_K_M.gguf")  # Temporarily disabled
MODEL_DIR = os.environ.get("MODEL_DIR", "models")
MAX_TOKENS = 2000
TEMPERATURE = 0.7
TOP_P = 0.9
TOP_K = 40
FREQUENCY_PENALTY = 0.0
PRESENCE_PENALTY = 0.0
SYSTEM_PROMPT = """Tu es TURBO PECH, un assistant pédagogique pour les élèves du collège et du lycée. 
Tu es spécialisé dans l'explication de cours et l'aide aux devoirs.
Tu donnes des explications claires, concises et adaptées au niveau scolaire de l'élève.
Tu peux expliquer des concepts difficiles avec des exemples concrets.
Tu encourages l'élève à réfléchir par lui-même."""

# Ajouter les chemins pour les données RAG
DOCUMENTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "documents")

# Model instance and information
model_instance = None
model_info = {
    "model_path": MODEL_PATH,
    "load_time": None,
    "n_ctx": 4096,
    "n_batch": 512,
    "n_gpu_layers": 0,
    "model_type": "local",  # "local", "openai", "gemini", "groq", "openrouter" 
    "model_name": None,
    "api_keys": {
        "openai": None,
        "gemini": None,
        "groq": None,
        "openrouter": None
    },
    "serpapi_key": None,  # Pour TurboSearch
    "inference_stats": {
        "total_requests": 0,
        "avg_response_time": 0,
        "total_time": 0
    }
}

# Dictionnaires pour stocker les sessions et données
stream_sessions = {}

# Token usage statistics for API models
token_usage = {
    "total_input_tokens": 0,
    "total_output_tokens": 0,
    "history": [],  # Store recent requests
    "limits": {
        "openai": {
            "free_rpm": 3,
            "free_tpm": 250000,
            "free_rpd": 200
        },
        "gemini": {
            "free_rpm": 60,
            "free_tpm": 1000000,
            "free_rpd": 1500
        },
        "groq": {
            "free_rpm": 30,
            "free_tpm": 6000,
            "free_rpd": 14400
        },
        "openrouter": {
            "free_rpm": 60,
            "free_tpm": 1000000,
            "free_rpd": 10000
        }
    }
}

# Nettoyage périodique des sessions expirées
async def cleanup_expired_sessions():
    while True:
        try:
            # Supprimer les sessions expirées
            current_time = datetime.now()
            expired_sessions = [
                session_id for session_id, session_data in stream_sessions.items()
                if session_data.get("expiry", current_time) < current_time
            ]
            
            for session_id in expired_sessions:
                del stream_sessions[session_id]
                
            # Attendre 5 minutes avant la prochaine vérification
            await asyncio.sleep(300)
        except Exception as e:
            print(f"Erreur lors du nettoyage des sessions : {e}")
            await asyncio.sleep(300)

# API-specific adaptateurs
class ModelAdapterBase:
    """Base class for model adapters"""
    def __init__(self):
        pass
    
    async def generate_response(self, messages, params):
        """Generate a response from the model"""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def stream_response(self, messages, params):
        """Stream a response from the model"""
        raise NotImplementedError("Subclasses must implement this method")

class LocalModelAdapter(ModelAdapterBase):
    """Adapter for local llama.cpp models"""
    def __init__(self, model_instance):
        super().__init__()
        self.model = model_instance
    
    async def generate_response(self, messages, params):
        """Generate a response from the local model"""
        if self.model is None:
            raise Exception("Model not loaded")
        
        response = self.model.create_chat_completion(
            messages=messages,
            max_tokens=params.get("max_tokens", MAX_TOKENS),
            temperature=params.get("temperature", TEMPERATURE),
            top_p=params.get("top_p", TOP_P),
            top_k=params.get("top_k", TOP_K),
            frequency_penalty=params.get("frequency_penalty", FREQUENCY_PENALTY),
            presence_penalty=params.get("presence_penalty", PRESENCE_PENALTY),
            stream=False
        )
        return response
    
    async def stream_response(self, messages, params):
        """Stream a response from the local model"""
        if self.model is None:
            raise Exception("Model not loaded")
        
        stream = self.model.create_chat_completion(
            messages=messages,
            max_tokens=params.get("max_tokens", MAX_TOKENS),
            temperature=params.get("temperature", TEMPERATURE),
            top_p=params.get("top_p", TOP_P),
            top_k=params.get("top_k", TOP_K),
            frequency_penalty=params.get("frequency_penalty", FREQUENCY_PENALTY),
            presence_penalty=params.get("presence_penalty", PRESENCE_PENALTY),
            stream=True
        )
        
        collected_content = ""
        for chunk in stream:
            if not chunk:
                continue
            
            content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
            collected_content += content
            
            if content:
                yield json.dumps({
                    "type": "chunk",
                    "data": content
                })
                
            # Add a small delay to avoid overwhelming the client
            await asyncio.sleep(0.01)
        
        # Send final message
        yield json.dumps({
            "type": "end",
            "data": collected_content,
            "stats": {
                "message_length": len(collected_content)
            }
        })

class OpenAIAdapter(ModelAdapterBase):
    """Adapter for OpenAI API"""
    def __init__(self, api_key, model_name="gpt-3.5-turbo"):
        super().__init__()
        self.api_key = api_key
        self.model_name = model_name
        self.api_url = "https://api.openai.com/v1/chat/completions"
    
    async def generate_response(self, messages, params):
        """Generate a response from OpenAI API"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": params.get("temperature", TEMPERATURE),
            "max_tokens": params.get("max_tokens", MAX_TOKENS),
            "top_p": params.get("top_p", TOP_P),
            "frequency_penalty": params.get("frequency_penalty", FREQUENCY_PENALTY),
            "presence_penalty": params.get("presence_penalty", PRESENCE_PENALTY)
        }
        
        response = requests.post(self.api_url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.text}")
        
        return response.json()
    
    async def stream_response(self, messages, params):
        """Stream a response from OpenAI API"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": params.get("temperature", TEMPERATURE),
            "max_tokens": params.get("max_tokens", MAX_TOKENS),
            "top_p": params.get("top_p", TOP_P),
            "frequency_penalty": params.get("frequency_penalty", FREQUENCY_PENALTY),
            "presence_penalty": params.get("presence_penalty", PRESENCE_PENALTY),
            "stream": True
        }
        
        response = requests.post(self.api_url, headers=headers, json=payload, stream=True)
        
        if response.status_code != 200:
            yield json.dumps({
                "type": "error",
                "data": f"OpenAI API error: {response.text}"
            })
            return
        
        collected_content = ""
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        if "content" in delta:
                            content = delta["content"]
                            collected_content += content
                            
                            yield json.dumps({
                                "type": "chunk",
                                "data": content
                            })
                    except Exception as e:
                        yield json.dumps({
                            "type": "error",
                            "data": str(e)
                        })
        
        # Send final message
        yield json.dumps({
            "type": "end",
            "data": collected_content,
            "stats": {
                "message_length": len(collected_content)
            }
        })

class GeminiAdapter(ModelAdapterBase):
    """Adapter for Google Gemini API"""
    def __init__(self, api_key, model_name="gemini-2.0-flash"):
        super().__init__()
        self.api_key = api_key
        self.model_name = model_name
        self.api_base_url = "https://generativelanguage.googleapis.com/v1"
        self.available_models = self._fetch_available_models()
        self.token_usage = {"total_input_tokens": 0, "total_output_tokens": 0}
        self.history = []
        
    def _fetch_available_models(self):
        """Fetch available Gemini models from the API"""
        try:
            print("Tentative de récupération des modèles Gemini disponibles...")
            import google.generativeai as genai
            
            # Configure l'API Gemini avec la clé fournie
            genai.configure(api_key=self.api_key)
            
            # Récupère la liste complète des modèles disponibles
            all_models = genai.list_models()
            
            # Filtre pour ne garder que les modèles Gemini et trier par version
            gemini_models = []
            for model in all_models:
                if "gemini" in model.name.lower():
                    model_info = {
                        "model": model.name,
                        "version": self._extract_version(model.name),
                        "display_name": model.display_name if hasattr(model, 'display_name') else model.name.split("/")[-1],
                        "input_token_limit": model.input_token_limit if hasattr(model, 'input_token_limit') else 32768,
                        "output_token_limit": model.output_token_limit if hasattr(model, 'output_token_limit') else 8192
                    }
                    gemini_models.append(model_info)
            
            # Trier les modèles par version (les plus récents d'abord)
            gemini_models.sort(key=lambda x: x["version"], reverse=True)
            
            print(f"Modèles Gemini disponibles: {len(gemini_models)} modèles trouvés")
            
            # Prépare les données pour l'interface
            formatted_models = []
            for model_info in gemini_models:
                model_name = model_info["model"]
                display_name = model_info["display_name"]
                # Extraire juste le nom du modèle sans le chemin complet
                simple_name = model_name.split("/")[-1] if "/" in model_name else model_name
                
                # Déterminer la description basée sur le nom du modèle
                description = "Modèle standard"
                if "2.0" in simple_name:
                    if "flash" in simple_name.lower():
                        description = "Gemini 2.0 - Le plus récent et rapide"
                    else:
                        description = "Gemini 2.0 - Le plus récent et performant"
                elif "1.5" in simple_name:
                    if "flash" in simple_name.lower():
                        description = "Gemini 1.5 - Rapide et économique"
                    elif "pro" in simple_name.lower():
                        description = "Gemini 1.5 - Haute performance"
                    else:
                        description = "Gemini 1.5 - Standard"
                elif "1.0" in simple_name:
                    description = "Gemini 1.0 - Version précédente"
                
                # Déterminer la limite de contexte
                context_length = max(model_info["input_token_limit"], 16384)
                
                formatted_models.append({
                    "id": model_name,  # ID complet pour l'API
                    "name": display_name or simple_name,  # Nom d'affichage ou nom simplifié
                    "description": description,
                    "context_length": context_length,
                    "pricing": "Modèle Google AI",
                    "version": model_info["version"]
                })
            
            if not formatted_models:
                print("Aucun modèle Gemini trouvé dans l'API, utilisation des modèles par défaut")
                # Si la liste est vide malgré une réponse OK de l'API, utiliser la liste par défaut
                return self._get_default_models()
                
            return formatted_models
        except ImportError:
            print("Module google.generativeai non installé. Installation en cours...")
            try:
                import pip
                pip.main(['install', 'google-generativeai'])
                print("Module installé, nouvelle tentative...")
                return self._fetch_available_models()
            except Exception as e:
                print(f"Échec de l'installation: {str(e)}")
                return self._get_default_models()
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles Gemini: {str(e)}")
            # Utiliser la liste minimale par défaut
            return self._get_default_models()
    
    def _extract_version(self, model_name):
        """Extrait le numéro de version d'un nom de modèle Gemini pour pouvoir trier"""
        version = 0
        if "2.0" in model_name:
            version = 2.0
        elif "1.5" in model_name:
            version = 1.5
        elif "1.0" in model_name:
            version = 1.0
        
        # Ajouter des points pour les variantes (pro > standard > flash)
        if "pro" in model_name.lower():
            version += 0.2
        elif "flash" in model_name.lower():
            version += 0.1
            
        return version
    
    def _get_default_models(self):
        """Fournit une liste de modèles Gemini par défaut"""
        print("Utilisation de la liste de modèles Gemini par défaut")
        return [
            {
                "id": "gemini-2.0-flash",
                "name": "Gemini 2.0 Flash",
                "description": "Gemini 2.0 - Le plus récent et rapide",
                "context_length": 32768,
                "pricing": "Modèle Google AI",
                "version": 2.01
            },
            {
                "id": "gemini-2.0-pro",
                "name": "Gemini 2.0 Pro",
                "description": "Gemini 2.0 - Le plus récent et performant",
                "context_length": 32768,
                "pricing": "Modèle Google AI",
                "version": 2.02
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "description": "Gemini 1.5 - Rapide et économique",
                "context_length": 32768,
                "pricing": "Modèle Google AI",
                "version": 1.51
            },
            {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "description": "Gemini 1.5 - Haute performance",
                "context_length": 32768,
                "pricing": "Modèle Google AI",
                "version": 1.52
            }
        ]
    
    def _estimate_tokens(self, text):
        """Rough estimation of tokens (4 chars ≈ 1 token)"""
        return len(text) // 4
    
    def _update_token_usage(self, input_text, output_text):
        """Update token usage statistics"""
        input_tokens = self._estimate_tokens(input_text)
        output_tokens = self._estimate_tokens(output_text)
        
        self.token_usage["total_input_tokens"] += input_tokens
        self.token_usage["total_output_tokens"] += output_tokens
        
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "input_preview": input_text[:100] + "..." if len(input_text) > 100 else input_text
        })
        
        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }
    
    def _convert_messages(self, messages):
        """Convert messages to Gemini format"""
        gemini_messages = []
        combined_user_input = ""
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            if role == "system":
                gemini_messages.append({
                    "role": "user",
                    "parts": [{"text": content}]
                })
                gemini_messages.append({
                    "role": "model",
                    "parts": [{"text": "Je comprends. Je suivrai ces instructions."}]
                })
            elif role == "user":
                if not gemini_messages or gemini_messages[-1]["role"] != "user":
                    gemini_messages.append({
                        "role": "user",
                        "parts": [{"text": content}]
                    })
                    combined_user_input = content
                else:
                    # For consecutive user messages, combine them (Gemini API limitation)
                    gemini_messages[-1]["parts"][0]["text"] += "\n\n" + content
                    combined_user_input += "\n\n" + content
            elif role == "assistant":
                gemini_messages.append({
                    "role": "model",
                    "parts": [{"text": content}]
                })
        
        return gemini_messages, combined_user_input
    
    async def generate_response(self, messages, params):
        """Generate a response from Gemini API"""
        headers = {
            "Content-Type": "application/json"
        }
        
        gemini_messages, combined_input = self._convert_messages(messages)
        
        # For gemini-1.5-flash and other chat models
        if "1.5" in self.model_name or "pro" in self.model_name:
            url = f"{self.api_base_url}/models/{self.model_name}:generateContent?key={self.api_key}"
            
            payload = {
                "contents": gemini_messages,
                "generationConfig": {
                    "temperature": params.get("temperature", 0.7),
                    "maxOutputTokens": params.get("max_tokens", 2000),
                    "topP": params.get("top_p", 0.95),
                }
            }
        else:
            # Legacy format for older models
            url = f"{self.api_base_url}/models/{self.model_name}:generateContent?key={self.api_key}"
            
            payload = {
                "contents": gemini_messages,
                "generationConfig": {
                    "temperature": params.get("temperature", 0.7),
                    "maxOutputTokens": params.get("max_tokens", 2000),
                    "topP": params.get("top_p", 0.95),
                }
            }
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.text}")
        
        response_json = response.json()
        
        # Extract text from response
        if "candidates" in response_json and len(response_json["candidates"]) > 0:
            candidate = response_json["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                gemini_text = candidate["content"]["parts"][0]["text"]
            else:
                gemini_text = "Désolé, je n'ai pas pu générer de réponse."
        else:
            gemini_text = "Désolé, je n'ai pas pu générer de réponse."
        
        # Update token usage stats
        token_info = self._update_token_usage(combined_input, gemini_text)
        
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": gemini_text
                    }
                }
            ],
            "token_usage": self.token_usage,
            "current_request_tokens": token_info
        }
    
    async def stream_response(self, messages, params):
        """Stream a response from Gemini API (note: simulate streaming since Gemini doesn't support it natively)"""
        try:
            response = await self.generate_response(messages, params)
            content = response["choices"][0]["message"]["content"]
            token_info = response.get("current_request_tokens", {})
            
            # Simulate streaming by sending chunks of the response
            words = content.split(" ")
            chunk_size = min(5, max(1, len(words) // 20))  # Dynamic chunk size
            
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i+chunk_size])
                
                if i == 0:
                    # First chunk includes token usage
                    yield json.dumps({
                        "type": "chunk",
                        "data": chunk,
                        "token_info": token_info
                    })
                else:
                    yield json.dumps({
                        "type": "chunk",
                        "data": chunk
                    })
                
                # Small delay to simulate streaming
                await asyncio.sleep(0.05)
            
            # Send final message with complete token info
            yield json.dumps({
                "type": "end",
                "data": content,
                "stats": {
                    "message_length": len(content),
                    "model": self.model_name,
                }
            })
        except Exception as e:
            yield json.dumps({
                "type": "error",
                "data": str(e)
            })

class GroqAdapter(ModelAdapterBase):
    """Adapter for Groq API"""
    def __init__(self, api_key, model_name="llama-3.1-8b-instant"):
        super().__init__()
        self.api_key = api_key
        self.model_name = model_name
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
    
    async def generate_response(self, messages, params):
        """Generate a response from Groq API"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": params.get("temperature", TEMPERATURE),
            "max_tokens": params.get("max_tokens", MAX_TOKENS),
            "top_p": params.get("top_p", TOP_P),
            "frequency_penalty": params.get("frequency_penalty", FREQUENCY_PENALTY),
            "presence_penalty": params.get("presence_penalty", PRESENCE_PENALTY)
        }
        
        response = requests.post(self.api_url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"Groq API error: {response.text}")
        
        response_json = response.json()
        
        # Update token usage
        if "usage" in response_json:
            token_usage["total_input_tokens"] += response_json["usage"].get("prompt_tokens", 0)
            token_usage["total_output_tokens"] += response_json["usage"].get("completion_tokens", 0)
            
            # Add to history
            token_usage["history"].append({
                "timestamp": datetime.now().isoformat(),
                "input_tokens": response_json["usage"].get("prompt_tokens", 0),
                "output_tokens": response_json["usage"].get("completion_tokens", 0),
                "model": self.model_name
            })
            
            # Limit history size
            if len(token_usage["history"]) > 100:
                token_usage["history"] = token_usage["history"][-100:]
        
        return response_json
    
    async def stream_response(self, messages, params):
        """Stream a response from Groq API"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": params.get("temperature", TEMPERATURE),
            "max_tokens": params.get("max_tokens", MAX_TOKENS),
            "top_p": params.get("top_p", TOP_P),
            "frequency_penalty": params.get("frequency_penalty", FREQUENCY_PENALTY),
            "presence_penalty": params.get("presence_penalty", PRESENCE_PENALTY),
            "stream": True
        }
        
        response = requests.post(self.api_url, headers=headers, json=payload, stream=True)
        
        if response.status_code != 200:
            raise Exception(f"Groq API error: {response.status_code}")
        
        collected_content = ""
        input_tokens = 0
        output_tokens = 0
        
        for line in response.iter_lines():
            if not line:
                continue
            
            line = line.decode("utf-8")
            if line.startswith("data: "):
                # Remove the "data: " prefix
                data = line[6:]
                if data == "[DONE]":
                    break
                
                try:
                    chunk = json.loads(data)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content", "")
                    
                    if content:
                        collected_content += content
                        yield json.dumps({
                            "type": "chunk",
                            "data": content
                        })
                    
                    # Track usage if available
                    if "usage" in chunk:
                        input_tokens = chunk["usage"].get("prompt_tokens", input_tokens)
                        output_tokens = chunk["usage"].get("completion_tokens", output_tokens)
                        
                except json.JSONDecodeError:
                    print(f"Error decoding JSON: {data}")
                    continue
            
            await asyncio.sleep(0.01)
        
        # Update token usage after streaming ends
        token_usage["total_input_tokens"] += input_tokens
        token_usage["total_output_tokens"] += output_tokens
        
        token_usage["history"].append({
            "timestamp": datetime.now().isoformat(),
            "input_tokens": input_tokens,
            "output_tokens": len(collected_content) // 4,  # Rough estimation
            "model": self.model_name
        })
        
        # Limit history size
        if len(token_usage["history"]) > 100:
            token_usage["history"] = token_usage["history"][-100:]
        
        # Send final message
        yield json.dumps({
            "type": "end",
            "data": collected_content,
            "stats": {
                "message_length": len(collected_content),
                "input_tokens": input_tokens,
                "output_tokens": output_tokens
            }
        })

class OpenRouterAdapter(ModelAdapterBase):
    """Adapter for OpenRouter API (integrates multiple models)"""
    def __init__(self, api_key, model_id="google/gemini-2.0-flash-exp:free"):
        super().__init__()
        self.api_key = api_key
        self.model_id = model_id
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.available_models = []
        self._fetch_available_models()
        
        # Vérifier si c'est un modèle Qwen
        self.is_qwen_model = "qwen" in model_id.lower()
        if self.is_qwen_model:
            print(f"Modèle Qwen détecté dans l'adaptateur: {model_id}")
    
    def _fetch_available_models(self):
        """Fetch available models from OpenRouter API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "HTTP-Referer": "https://turbochat.app"  # Replace with your actual domain
            }
            
            response = requests.get("https://openrouter.ai/api/v1/models", headers=headers)
            
            if response.status_code != 200:
                print(f"Error fetching OpenRouter models: {response.text}")
                return
            
            models_data = response.json().get("data", [])
            self.available_models = []
            
            for model in models_data:
                model_info = {
                    "id": model.get("id"),
                    "name": model.get("name", model.get("id")),
                    "description": model.get("description", ""),
                    "context_length": model.get("context_length", 4096),
                    "pricing": {
                        "input": model.get("pricing", {}).get("input", 0),
                        "output": model.get("pricing", {}).get("output", 0)
                    },
                    "is_free": model.get("pricing", {}).get("input", 0) == 0 and model.get("pricing", {}).get("output", 0) == 0
                }
                self.available_models.append(model_info)
                
        except Exception as e:
            print(f"Error fetching OpenRouter models: {e}")
    
    def get_available_models(self):
        """Return available models"""
        return self.available_models
    
    async def generate_response(self, messages, params):
        """Generate a response from OpenRouter API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://turbochat.app",  # Replace with your actual domain
            "X-Title": "TurboChat"  # Site title for rankings
        }
        
        payload = {
            "model": self.model_id,
            "messages": messages,
            "temperature": params.get("temperature", TEMPERATURE),
            "max_tokens": params.get("max_tokens", MAX_TOKENS),
            "top_p": params.get("top_p", TOP_P),
            "frequency_penalty": params.get("frequency_penalty", FREQUENCY_PENALTY),
            "presence_penalty": params.get("presence_penalty", PRESENCE_PENALTY),
            "stream": False  # Les modèles Qwen ne supportent pas le streaming
        }
        
        try:
            print(f"Sending request to OpenRouter API for model: {self.model_id}")
            print(f"Headers: {headers}")
            print(f"Payload (partial): {str(payload)[:200]}...")
            
            # Ajouter un timeout plus long pour les modèles Qwen
            timeout = 120 if self.is_qwen_model else 60
            
            if self.is_qwen_model:
                print(f"Utilisation d'un timeout étendu ({timeout}s) pour le modèle Qwen: {self.model_id}")
            
            # Log de début de requête avec timestamp
            print(f"DÉBUT REQUÊTE [{datetime.now().isoformat()}]: Envoi de la requête à OpenRouter pour {self.model_id}")
            
            # Utiliser l'approche exacte fournie par l'utilisateur
            try:
                response = requests.post(
                    url=self.api_url,
                    headers=headers,
                    data=json.dumps(payload),
                    timeout=timeout
                )
                
                print(f"RÉPONSE REÇUE [{datetime.now().isoformat()}]: Statut {response.status_code} de OpenRouter pour {self.model_id}")
                print(f"Response status code: {response.status_code}")
                
                if response.status_code != 200:
                    error_message = f"OpenRouter API error: {response.status_code}"
                    try:
                        error_json = response.json()
                        error_message = f"OpenRouter API error: {error_json.get('error', {}).get('message', str(error_json))}"
                    except Exception as parse_error:
                        print(f"Impossible de parser la réponse d'erreur JSON: {parse_error}")
                        print(f"Contenu brut de la réponse d'erreur: {response.text[:500]}...")
                    
                    print(f"Error: {error_message}")
                    raise Exception(error_message)
                
                # Log de tentative de parsing JSON
                print(f"PARSING JSON [{datetime.now().isoformat()}]: Tentative de parsing de la réponse pour {self.model_id}")
                
                try:
                    response_json = response.json()
                    print(f"JSON PARSÉ [{datetime.now().isoformat()}]: Réponse JSON parsée avec succès pour {self.model_id}")
                except Exception as json_error:
                    print(f"ERREUR PARSING [{datetime.now().isoformat()}]: Échec du parsing JSON pour {self.model_id}: {json_error}")
                    print(f"Contenu brut de la réponse: {response.text[:500]}...")
                    raise Exception(f"Échec du parsing de la réponse JSON: {json_error}")
                
                # Pour les modèles Qwen, vérifier que la réponse est complète
                if self.is_qwen_model and "choices" in response_json and len(response_json["choices"]) > 0:
                    response_content = response_json["choices"][0]["message"]["content"]
                    print(f"Réponse complète du modèle Qwen reçue, longueur: {len(response_content)} caractères")
                    print(f"Début du contenu: {response_content[:100]}...")
                
                # Update token usage
                if "usage" in response_json:
                    token_usage["total_input_tokens"] += response_json["usage"].get("prompt_tokens", 0)
                    token_usage["total_output_tokens"] += response_json["usage"].get("completion_tokens", 0)
                    
                    # Add to history
                    token_usage["history"].append({
                        "timestamp": datetime.now().isoformat(),
                        "input_tokens": response_json["usage"].get("prompt_tokens", 0),
                        "output_tokens": response_json["usage"].get("completion_tokens", 0),
                        "model": self.model_id
                    })
                    
                    # Limit history size
                    if len(token_usage["history"]) > 100:
                        token_usage["history"] = token_usage["history"][-100:]
                
                print(f"FIN TRAITEMENT [{datetime.now().isoformat()}]: Réponse traitée avec succès pour {self.model_id}")
                return response_json
            
            except requests.exceptions.Timeout:
                print(f"TIMEOUT [{datetime.now().isoformat()}]: La requête a expiré après {timeout}s pour {self.model_id}")
                raise Exception(f"La requête a expiré après {timeout} secondes. Le modèle {self.model_id} peut être surchargé.")
            
            except requests.exceptions.RequestException as req_error:
                print(f"ERREUR REQUÊTE [{datetime.now().isoformat()}]: {req_error} pour {self.model_id}")
                raise Exception(f"Erreur lors de la requête HTTP: {req_error}")
                
        except Exception as e:
            print(f"EXCEPTION GÉNÉRALE [{datetime.now().isoformat()}] dans generate_response: {e}")
            raise e
    
    async def stream_response(self, messages, params):
        """Stream a response from OpenRouter API"""
        # Si c'est un modèle Qwen, utiliser l'approche non-streaming
        if self.is_qwen_model:
            print(f"Modèle Qwen détecté, utilisation du mode non-streaming pour {self.model_id}")
            try:
                response_json = await self.generate_response(messages, params)
                
                if "choices" in response_json and len(response_json["choices"]) > 0:
                    content = response_json["choices"][0]["message"]["content"]
                    print(f"Réponse non-streaming reçue pour Qwen, longueur: {len(content)} caractères")
                    
                    # Envoyer le contenu complet
                    yield json.dumps({
                        "type": "chunk",
                        "data": content
                    })
                    
                    # Ajouter un délai pour permettre au client de traiter
                    await asyncio.sleep(0.5)
                    
                    # Envoyer le message final
                    yield json.dumps({
                        "type": "end",
                        "data": content,
                        "stats": {
                            "message_length": len(content),
                            "model": self.model_id
                        }
                    })
                    
                    return
                else:
                    raise Exception("Réponse invalide de l'API OpenRouter")
                    
            except Exception as e:
                print(f"Erreur lors de la génération de réponse non-streaming pour Qwen: {e}")
                yield json.dumps({
                    "type": "error",
                    "data": f"Erreur lors de la génération de réponse: {str(e)}"
                })
                return
        
        # Pour les autres modèles, utiliser le streaming normal
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://turbochat.app",  # Replace with your actual domain
                "X-Title": "TurboChat"  # Site title for rankings
            }
            
            payload = {
                "model": self.model_id,
                "messages": messages,
                "temperature": params.get("temperature", TEMPERATURE),
                "max_tokens": params.get("max_tokens", MAX_TOKENS),
                "top_p": params.get("top_p", TOP_P),
                "frequency_penalty": params.get("frequency_penalty", FREQUENCY_PENALTY),
                "presence_penalty": params.get("presence_penalty", PRESENCE_PENALTY),
                "stream": True
            }
            
            print(f"Envoi de la requête streaming à OpenRouter pour le modèle {self.model_id}")
            print(f"Headers: {headers}")
            print(f"Payload (partial): {str(payload)[:200]}...")
            
            # Generate a unique request ID for tracking
            request_id = str(uuid.uuid4())
            print(f"Generated request ID for streaming: {request_id}")
            
            # Utiliser l'approche exacte fournie par l'utilisateur mais avec stream=True
            response = requests.post(
                url=self.api_url,
                headers=headers,
                data=json.dumps(payload),
                stream=True,
                timeout=60
            )
            
            if response.status_code != 200:
                error_message = f"OpenRouter API error: {response.status_code}"
                try:
                    error_json = response.json()
                    error_message = f"OpenRouter API error: {error_json.get('error', {}).get('message', str(error_json))}"
                except:
                    pass
                
                print(f"Erreur API OpenRouter: {error_message}")
                yield json.dumps({
                    "type": "error",
                    "data": error_message
                })
                return
            
            collected_content = ""
            input_tokens = 0
            output_tokens = 0
            
            print(f"Début du traitement du stream pour {self.model_id} (request_id: {request_id})")
            
            chunk_count = 0
            last_log_time = time.time()
            
            for line in response.iter_lines():
                if not line:
                    continue
                
                line = line.decode("utf-8")
                chunk_count += 1
                
                # Log périodiquement pour ne pas spam les logs
                current_time = time.time()
                if current_time - last_log_time > 5:  # Log toutes les 5 secondes
                    print(f"Stream en cours (request_id: {request_id}), {chunk_count} chunks reçus, dernier chunk: {line[:50]}...")
                    last_log_time = current_time
                
                if line.startswith("data: "):
                    # Remove the "data: " prefix
                    data = line[6:]
                    if data == "[DONE]":
                        print(f"Fin du stream détectée (request_id: {request_id})")
                        break
                    
                    try:
                        chunk = json.loads(data)
                        if "error" in chunk:
                            error_message = chunk.get("error", {}).get("message", "Unknown error")
                            print(f"Erreur dans la réponse: {error_message}")
                            yield json.dumps({
                                "type": "error",
                                "data": f"OpenRouter API error: {error_message}"
                            })
                            return
                        
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        
                        if content:
                            collected_content += content
                            yield json.dumps({
                                "type": "chunk",
                                "data": content
                            })
                        
                        # Track usage if available
                        if "usage" in chunk:
                            input_tokens = chunk["usage"].get("prompt_tokens", input_tokens)
                            output_tokens = chunk["usage"].get("completion_tokens", output_tokens)
                            
                    except json.JSONDecodeError as e:
                        print(f"Erreur de décodage JSON: {data[:100]}{'...' if len(data) > 100 else ''}, erreur: {e}")
                        continue
                    except Exception as e:
                        print(f"Erreur inattendue lors du traitement du chunk: {e}")
                        continue
                
                await asyncio.sleep(0.01)
            
            # Vérifier si aucun contenu n'a été collecté
            if not collected_content:
                print(f"Aucun contenu collecté pendant le streaming (request_id: {request_id}), tentative de fallback")
                try:
                    # Fallback à non-streaming
                    non_stream_params = params.copy()
                    non_stream_payload = payload.copy()
                    non_stream_payload["stream"] = False
                    
                    fallback_response = requests.post(
                        url=self.api_url,
                        headers=headers,
                        data=json.dumps(non_stream_payload),
                        timeout=60
                    )
                    
                    if fallback_response.status_code == 200:
                        fallback_json = fallback_response.json()
                        if "choices" in fallback_json and len(fallback_json["choices"]) > 0:
                            content = fallback_json["choices"][0]["message"]["content"]
                            yield json.dumps({
                                "type": "chunk",
                                "data": content
                            })
                            collected_content = content
                            
                            if "usage" in fallback_json:
                                input_tokens = fallback_json["usage"].get("prompt_tokens", 0)
                                output_tokens = fallback_json["usage"].get("completion_tokens", 0)
                    else:
                        print(f"Échec du fallback non-streaming (request_id: {request_id}), statut: {fallback_response.status_code}")
                except Exception as e:
                    print(f"Erreur lors du fallback non-streaming (request_id: {request_id}): {e}")
                    yield json.dumps({
                        "type": "error",
                        "data": f"Erreur lors du fallback: {str(e)}"
                    })
            
            print(f"Fin du streaming (request_id: {request_id}), contenu collecté: {len(collected_content)} caractères")
            
            # Update token usage after streaming ends
            token_usage["total_input_tokens"] += input_tokens
            token_usage["total_output_tokens"] += output_tokens
            
            token_usage["history"].append({
                "timestamp": datetime.now().isoformat(),
                "input_tokens": input_tokens,
                "output_tokens": len(collected_content) // 4,  # Rough estimation
                "model": self.model_id
            })
            
            # Limit history size
            if len(token_usage["history"]) > 100:
                token_usage["history"] = token_usage["history"][-100:]
            
            # Send final message
            yield json.dumps({
                "type": "end",
                "data": collected_content,
                "stats": {
                    "message_length": len(collected_content),
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens
                }
            })
        except requests.exceptions.RequestException as e:
            print(f"Exception de requête HTTP: {e}")
            yield json.dumps({
                "type": "error",
                "data": f"Erreur de connexion: {str(e)}"
            })
        except Exception as e:
            print(f"Exception générale: {e}")
            yield json.dumps({
                "type": "error",
                "data": f"Erreur inattendue: {str(e)}"
            })

# Fonction pour obtenir l'adaptateur de modèle approprié en fonction de la configuration
def get_model_adapter():
    """Get the appropriate model adapter based on current configuration"""
    if model_info["model_type"] == "local":
        if model_instance is None:
            # Si le modèle local n'est pas chargé, essayer de basculer vers une API disponible
            print("Local model not available, attempting to switch to API model...")
            
            # Vérifier si des clés API sont disponibles et basculer automatiquement
            for api_type in ["openai", "gemini", "groq", "openrouter"]:
                if model_info["api_keys"].get(api_type):
                    print(f"Switching to {api_type} API model")
                    model_info["model_type"] = api_type
                    if api_type == "openai":
                        model_info["model_name"] = "gpt-3.5-turbo"
                        return OpenAIAdapter(model_info["api_keys"]["openai"], model_info["model_name"])
                    elif api_type == "gemini":
                        model_info["model_name"] = "gemini-2.0-flash"
                        return GeminiAdapter(model_info["api_keys"]["gemini"], model_info["model_name"])
                    elif api_type == "groq":
                        model_info["model_name"] = "llama-3.1-8b-instant"
                        return GroqAdapter(model_info["api_keys"]["groq"], model_info["model_name"])
                    elif api_type == "openrouter":
                        model_info["model_name"] = "google/gemini-2.0-flash-exp:free"
                        return OpenRouterAdapter(model_info["api_keys"]["openrouter"], model_info["model_name"])
            
            # Si aucune API n'est disponible, lever une exception explicite
            raise HTTPException(
                status_code=503,
                detail="Local model is not loaded and no API keys are configured. Please configure an API key in Settings or check the local model."
            )
        
        print("Using local model adapter")
        return LocalModelAdapter(model_instance)
    elif model_info["model_type"] == "openai":
        print(f"Using OpenAI adapter with model: {model_info['model_name']}")
        return OpenAIAdapter(model_info["api_keys"]["openai"], model_info["model_name"])
    elif model_info["model_type"] == "gemini":
        print(f"Using Gemini adapter with model: {model_info['model_name']}")
        return GeminiAdapter(model_info["api_keys"]["gemini"], model_info["model_name"])
    elif model_info["model_type"] == "groq":
        print(f"Using Groq adapter with model: {model_info['model_name']}")
        return GroqAdapter(model_info["api_keys"]["groq"], model_info["model_name"])
    elif model_info["model_type"] == "openrouter":
        print(f"Using OpenRouter adapter with model: {model_info['model_name']}")
        return OpenRouterAdapter(model_info["api_keys"]["openrouter"], model_info["model_name"])
    else:
        raise Exception(f"Unknown model type: {model_info['model_type']}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    global model_instance
    model_instance = None  # Initialize to None
    
    try:
        if os.path.exists(MODEL_PATH):
            print(f"Attempting to load model from: {MODEL_PATH}")
            start_time = datetime.now()
            model_instance = Llama(
                model_path=MODEL_PATH,
                n_ctx=model_info["n_ctx"],
                n_batch=model_info["n_batch"],
                n_gpu_layers=model_info["n_gpu_layers"]
            )
            load_time = (datetime.now() - start_time).total_seconds()
            model_info["load_time"] = load_time
            print(f"Model loaded successfully in {load_time:.2f} seconds")
        else:
            print(f"Model file not found: {MODEL_PATH}")
            print("TurboChat will start without local model, API models will be available")
    except Exception as e:
        print(f"Error loading model: {e}")
        print("TurboChat will start without local model, API models will be available")
        model_instance = None
    
    # Démarrer la tâche de nettoyage des sessions
    cleanup_task = asyncio.create_task(cleanup_expired_sessions())
    
    # Yield control to the application
    yield
    
    # Cleanup on shutdown
    model_instance = None
    
    # Annuler la tâche de nettoyage
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: Optional[int] = MAX_TOKENS
    temperature: Optional[float] = TEMPERATURE
    top_p: Optional[float] = TOP_P
    top_k: Optional[int] = TOP_K
    frequency_penalty: Optional[float] = FREQUENCY_PENALTY
    presence_penalty: Optional[float] = PRESENCE_PENALTY
    stream: Optional[bool] = False

class ModelChangeRequest(BaseModel):
    model_file: str
    n_ctx: Optional[int] = 4096
    n_batch: Optional[int] = 512
    n_gpu_layers: Optional[int] = 0

class ApiKeyRequest(BaseModel):
    api_key: str
    model_type: Literal["openai", "gemini", "groq", "openrouter"]
    model_name: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "TurboChat API is running"}

@app.get("/status")
async def status():
    if model_info["model_type"] == "local" and model_instance is None:
        return {"status": "Model not loaded"}
    
    # Return extended model information
    status_info = {
        "status": "Active",
        "model_type": model_info["model_type"],
    }
    
    if model_info["model_type"] == "local":
        status_info.update({
            "model_path": MODEL_PATH,
            "model_name": os.path.basename(MODEL_PATH),
            "load_time": model_info["load_time"],
            "n_ctx": model_info["n_ctx"],
            "n_batch": model_info["n_batch"],
            "n_gpu_layers": model_info["n_gpu_layers"],
        })
    else:
        status_info.update({
            "model_name": model_info.get("model_name", "Unknown"),
            "api_connected": model_info["api_keys"][model_info["model_type"]] is not None
        })
    
    status_info["inference_stats"] = model_info["inference_stats"]
    
    return status_info

@app.get("/system-stats")
async def system_stats():
    """Return system statistics (CPU, memory, etc.)"""
    return {
        "cpu_percent": psutil.cpu_percent(),
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent,
            "used": psutil.virtual_memory().used
        },
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "uptime": datetime.now().timestamp() - psutil.boot_time()
    }

@app.post("/set-api-key")
async def set_api_key(request: ApiKeyRequest):
    """Set the API key for external API services"""
    global model_info
    
    # Store the API key in the specific service slot
    model_info["api_keys"][request.model_type] = request.api_key
    model_info["model_type"] = request.model_type
    
    # Pour Gemini, s'assurer qu'un modèle Gemini est sélectionné
    if request.model_type == "gemini":
        if not request.model_name or not request.model_name.startswith("gemini"):
            model_info["model_name"] = "gemini-2.0-flash"  # Modèle par défaut le plus récent
            print(f"Correction du modèle pour Gemini: utilisation de gemini-2.0-flash")
        else:
            model_info["model_name"] = request.model_name
    else:
        model_info["model_name"] = request.model_name
    
    # Validate the API key by creating a test adapter
    try:
        if request.model_type == "openai":
            adapter = OpenAIAdapter(request.api_key, model_info["model_name"] or "gpt-3.5-turbo")
        elif request.model_type == "gemini":
            adapter = GeminiAdapter(request.api_key, model_info["model_name"] or "gemini-2.0-flash")
        elif request.model_type == "groq":
            adapter = GroqAdapter(request.api_key, model_info["model_name"] or "llama-3.1-8b-instant")
        elif request.model_type == "openrouter":
            adapter = OpenRouterAdapter(request.api_key, model_info["model_name"] or "google/gemini-2.0-flash-exp:free")
        
        # Test connection (no need to actually generate - just check access)
        if request.model_type == "openrouter":
            available_models = adapter.get_available_models()
            if not available_models:
                raise Exception("Could not fetch available models")
        elif request.model_type == "gemini":
            # Pour Gemini, essayer de charger la liste des modèles disponibles
            gemini_models = adapter._fetch_available_models()
            print(f"Modèles Gemini disponibles après validation de la clé API: {len(gemini_models) if gemini_models else 0}")
        
        return {
            "status": "API key set successfully",
            "model_type": request.model_type,
            "model_name": model_info["model_name"]  # Retourner le nom de modèle corrigé
        }
        
    except Exception as e:
        # Reset to local model if API key validation fails
        model_info["model_type"] = "local"
        model_info["api_keys"][request.model_type] = None
        model_info["model_name"] = None
        
        raise HTTPException(
            status_code=400,
            detail=f"API key validation failed: {str(e)}"
        )

@app.get("/api-models")
async def list_api_models():
    """List available models for external APIs like OpenAI, Gemini, etc."""
    global model_info
    
    # Pour la recherche de modèles Gemini, s'assurer que la clé API est configurée
    gemini_models = []
    if model_info.get("model_type") == "gemini" and model_info.get("api_keys", {}).get("gemini"):
        print(f"Clé API Gemini configurée, tentative de récupération des modèles disponibles")
        
        try:
            adapter = GeminiAdapter(model_info["api_keys"]["gemini"])
            gemini_models = adapter._fetch_available_models()
            print(f"Modèles Gemini récupérés: {len(gemini_models)}")
        except Exception as e:
            print(f"Erreur lors de la récupération des modèles Gemini: {e}")
    
    # Modèles OpenAI avec informations supplémentaires
    openai_models = [
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "Rapide et économique", "pricing": "Payant", "context_length": 16385},
        {"id": "gpt-4", "name": "GPT-4", "description": "Le plus performant", "pricing": "Payant", "context_length": 8192},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "Version améliorée, plus rapide", "pricing": "Payant", "context_length": 128000}
    ]
    
    # Ajouter les modèles Gemini
    print("Tentative de récupération des modèles Gemini...")
    formatted_gemini_models = []
    try:
        if model_info.get("model_type") == "gemini" and model_info.get("api_keys", {}).get("gemini") and gemini_models:
            # Organiser les modèles par version
            gemini_by_version = {
                "2.0": [],
                "1.5": [],
                "1.0": [],
                "other": []
            }
            
            for model in gemini_models:
                version = "other"
                if "2.0" in model["name"]:
                    version = "2.0"
                elif "1.5" in model["name"]:
                    version = "1.5"
                elif "1.0" in model["name"]:
                    version = "1.0"
                
                # Ajouter des informations sur la gratuité
                model["free"] = True  # La plupart des modèles Gemini ont une utilisation gratuite limitée
                gemini_by_version[version].append(model)
            
            # Formater les modèles pour l'affichage avec un regroupement par version
            for version in ["2.0", "1.5", "1.0", "other"]:
                if gemini_by_version[version]:
                    # Ajouter un séparateur de version seulement s'il y a plusieurs versions
                    if len(gemini_by_version["2.0"]) + len(gemini_by_version["1.5"]) + len(gemini_by_version["1.0"]) > 1:
                        if version == "2.0":
                            formatted_gemini_models.append({
                                "id": f"header-gemini-{version}",
                                "name": f"Gemini {version}",
                                "description": "Les plus récents et performants",
                                "is_header": True
                            })
                        elif version == "1.5":
                            formatted_gemini_models.append({
                                "id": f"header-gemini-{version}",
                                "name": f"Gemini {version}",
                                "description": "Excellente performance, meilleure compatibilité",
                                "is_header": True
                            })
                        elif version == "1.0":
                            formatted_gemini_models.append({
                                "id": f"header-gemini-{version}",
                                "name": f"Gemini {version}",
                                "description": "Version précédente, plus compatible",
                                "is_header": True
                            })
                        elif version == "other" and gemini_by_version["other"]:
                            formatted_gemini_models.append({
                                "id": "header-gemini-other",
                                "name": "Autres modèles Gemini",
                                "description": "Modèles spécialisés",
                                "is_header": True
                            })
                    
                    # Ajouter les modèles de cette version
                    formatted_gemini_models.extend(gemini_by_version[version])
            
            print(f"Modèles Gemini formatés avec succès: {len(formatted_gemini_models)}")
        else:
            print("API Gemini non configurée, utilisation des modèles par défaut")
            formatted_gemini_models = [
                {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "description": "Gemini 2.0 - Le plus récent et rapide", "context_length": 32768, "pricing": "Modèle Google AI", "free": True},
                {"id": "gemini-2.0-pro", "name": "Gemini 2.0 Pro", "description": "Gemini 2.0 - Le plus récent et performant", "context_length": 32768, "pricing": "Modèle Google AI", "free": True},
                {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "description": "Gemini 1.5 - Rapide et économique", "context_length": 32768, "pricing": "Modèle Google AI", "free": True},
                {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "description": "Gemini 1.5 - Haute performance", "context_length": 32768, "pricing": "Modèle Google AI", "free": True}
            ]
    except Exception as e:
        print(f"Erreur lors de la récupération des modèles Gemini: {e}")
        formatted_gemini_models = [
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "description": "Gemini 2.0 - Le plus récent et rapide", "context_length": 32768, "pricing": "Modèle Google AI", "free": True},
            {"id": "gemini-2.0-pro", "name": "Gemini 2.0 Pro", "description": "Gemini 2.0 - Le plus récent et performant", "context_length": 32768, "pricing": "Modèle Google AI", "free": True},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "description": "Gemini 1.5 - Rapide et économique", "context_length": 32768, "pricing": "Modèle Google AI", "free": True},
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "description": "Gemini 1.5 - Haute performance", "context_length": 32768, "pricing": "Modèle Google AI", "free": True}
        ]
    
    # Ajouter des informations sur les limites gratuites
    model_limits = {
        "gemini": {
            "free_rpm": 15,  # Requêtes par minute
            "free_tpm": 1_000_000,  # Tokens par minute
            "free_rpd": 1_500  # Requêtes par jour
        },
        "openai": {
            "depends_on_subscription": True,
            "info_url": "https://platform.openai.com/account/limits"
        }
    }
    
    return {
        "models": {
            "openai": openai_models,
            "gemini": formatted_gemini_models
        },
        "limits": model_limits
    }

@app.get("/token-usage")
async def get_token_usage():
    """Get token usage statistics for API models"""
    if model_info["model_type"] == "local":
        return {"error": "Token usage tracking is only available for API models"}
    
    try:
        adapter = get_model_adapter()
        if hasattr(adapter, "token_usage"):
            # Add limits information for the free tier
            result = {
                "token_usage": adapter.token_usage,
                "limits": {
                    "gemini": {
                        "free_rpm": 15,  # Requests per minute
                        "free_tpm": 1_000_000,  # Tokens per minute
                        "free_rpd": 1_500  # Requests per day
                    },
                    "openai": {
                        "depends_on_subscription": True,
                        "info_url": "https://platform.openai.com/account/limits"
                    }
                }
            }
            
            # Add usage history if available
            if hasattr(adapter, "history"):
                result["history"] = adapter.history[-10:]  # Last 10 interactions
            
            return result
        else:
            return {"error": "Current model adapter doesn't support token tracking"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/switch-to-local")
async def switch_to_local(model_file: str = Query(...)):
    """Switch back to using a local model"""
    global model_info, model_instance, MODEL_PATH
    
    model_path = os.path.join(MODEL_DIR, model_file)
    
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model file not found: {model_file}")
    
    # Unload current model
    model_instance = None
    
    # Update model info
    model_info["model_type"] = "local"
    model_info["api_keys"]["openai"] = None
    model_info["api_keys"]["gemini"] = None
    model_info["api_keys"]["groq"] = None
    model_info["api_keys"]["openrouter"] = None
    model_info["model_path"] = model_path
    model_info["inference_stats"] = {
        "total_requests": 0,
        "avg_response_time": 0,
        "total_time": 0
    }
    
    # Load new model
    try:
        start_time = datetime.now()
        model_instance = Llama(
            model_path=model_path,
            n_ctx=model_info["n_ctx"],
            n_batch=model_info["n_batch"],
            n_gpu_layers=model_info["n_gpu_layers"]
        )
        load_time = (datetime.now() - start_time).total_seconds()
        model_info["load_time"] = load_time
        
        MODEL_PATH = model_path
        return {
            "status": "Switched to local model successfully", 
            "model_path": MODEL_PATH,
            "model_name": os.path.basename(MODEL_PATH),
            "load_time": load_time
        }
    except Exception as e:
        model_info["model_type"] = "none"
        raise HTTPException(status_code=500, detail=str(e))

def format_chat_messages(messages: List[ChatMessage]):
    """Format messages for Llama instruction models"""
    formatted_msgs = []
    
    # Add system prompt as the first message if not present
    if not messages or messages[0].role != "system":
        formatted_msgs.append({"role": "system", "content": SYSTEM_PROMPT})
    
    # Add user messages
    for msg in messages:
        formatted_msgs.append({"role": msg.role, "content": msg.content})
    
    return formatted_msgs

async def stream_generator(messages, params):
    if model_info["model_type"] == "local" and model_instance is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    formatted_msgs = format_chat_messages(messages)
    
    try:
        start_time = datetime.now()
        
        # Get the appropriate adapter and generate streaming response
        adapter = get_model_adapter()
        async for chunk in adapter.stream_response(formatted_msgs, params):
            yield chunk
        
        # Update model stats
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds()
        
        model_info["inference_stats"]["total_requests"] += 1
        model_info["inference_stats"]["total_time"] += response_time
        model_info["inference_stats"]["avg_response_time"] = (
            model_info["inference_stats"]["total_time"] / model_info["inference_stats"]["total_requests"]
        )
            
    except Exception as e:
        yield json.dumps({
            "type": "error",
            "data": str(e)
        })

@app.post("/chat")
async def chat(request: ChatRequest):
    if model_info["model_type"] == "local" and model_instance is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    formatted_msgs = format_chat_messages(request.messages)
    
    try:
        params = {
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "top_k": request.top_k,
            "frequency_penalty": request.frequency_penalty,
            "presence_penalty": request.presence_penalty
        }
        
        if request.stream:
            # Stocker les messages dans la session pour la route /chat-stream
            session_id = str(uuid.uuid4())
            print(f"Creating new streaming session with ID: {session_id}")
            stream_sessions[session_id] = {
                "messages": formatted_msgs,
                "params": params,
                "expiry": datetime.now() + timedelta(minutes=5)
            }
            
            return {"status": "streaming", "session_id": session_id}
        else:
            start_time = datetime.now()
            
            # Get the appropriate adapter and generate response
            adapter = get_model_adapter()
            response = await adapter.generate_response(formatted_msgs, params)
            
            # Update model stats
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()
            
            model_info["inference_stats"]["total_requests"] += 1
            model_info["inference_stats"]["total_time"] += response_time
            model_info["inference_stats"]["avg_response_time"] = (
                model_info["inference_stats"]["total_time"] / model_info["inference_stats"]["total_requests"]
            )
            
            # Add timing information to the response
            if "stats" not in response:
                response["stats"] = {}
            
            response["stats"]["response_time"] = response_time
            if "choices" in response and len(response["choices"]) > 0 and "message" in response["choices"][0]:
                response["stats"]["message_length"] = len(response["choices"][0]["message"]["content"])
            
            return response
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint pour le streaming SSE
@app.get("/chat-stream")
async def chat_stream(request: Request):
    async def stream_generator():
        # Récupérer l'ID de session des paramètres de requête
        session_id = request.query_params.get("session_id", None)
        
        print(f"Received stream request with session ID: {session_id}")
        print(f"Available sessions: {list(stream_sessions.keys())}")
        
        # Si aucun ID de session n'est fourni, ou si la session n'existe pas
        if not session_id or session_id not in stream_sessions:
            # Si aucune session n'est disponible
            if not stream_sessions:
                error_msg = "Aucune session de conversation active. Veuillez envoyer un message d'abord."
                print(f"Error: {error_msg}")
                yield f"data: {json.dumps({'type': 'error', 'data': error_msg})}\n\n"
                yield "event: error\ndata: {}\n\n"
                return
            
            # Sinon, utiliser la dernière session créée
            last_session_id = list(stream_sessions.keys())[-1]
            print(f"Using last session: {last_session_id}")
            session_data = stream_sessions.get(last_session_id)
        else:
            session_data = stream_sessions.get(session_id)
            
        if not session_data:
            error_msg = "Session invalide ou expirée."
            print(f"Error: {error_msg}")
            yield f"data: {json.dumps({'type': 'error', 'data': error_msg})}\n\n"
            yield "event: error\ndata: {}\n\n"
            return
            
        messages = session_data["messages"]
        params = session_data["params"]
        
        # Vérifier s'il y a des métadonnées RAG dans la session
        rag_info = session_data.get("rag_info", None)
        search_info = session_data.get("search_info", None)
        original_query = session_data.get("query", None)
        
        # Helper function to format SSE data
        def format_sse_message(data):
            try:
                if isinstance(data, dict):
                    return f"data: {json.dumps(data)}\n\n"
                elif isinstance(data, str):
                    if data == "[DONE]":
                        return f"data: {data}\n\n"
                    else:
                        return f"data: {json.dumps({'type': 'chunk', 'data': data})}\n\n"
                else:
                    return f"data: {json.dumps({'type': 'chunk', 'data': str(data)})}\n\n"
            except Exception as e:
                print(f"Error formatting SSE message: {e}")
                return f"data: {json.dumps({'type': 'error', 'data': 'Error formatting message'})}\n\n"
        
        try:
            start_time = datetime.now()
            adapter = get_model_adapter()
            
            # Vérifier s'il s'agit d'une requête RAG avec sources à inclure dans le prompt
            if rag_info:
                print(f"Requête RAG détectée avec collection '{rag_info.get('collection')}'")
                
                # Envoyer une notification que la requête RAG est en cours de traitement
                yield format_sse_message({'type': 'info', 'data': 'Analyse des documents pertinents en cours...'})
                
                # Si la requête RAG utilise les sources dans l'historique des messages, les extraire
                collection_name = rag_info.get("collection")
                
                # Extraire les sources pour l'utilisateur
                if rag_info.get("sources") and len(rag_info.get("sources")) > 0:
                    rag_sources = rag_info.get("sources", [])
                    print(f"Envoi des sources RAG: {len(rag_sources)} documents")
                    
                    # Envoyer les sources pour affichage côté client
                    yield format_sse_message({
                        'type': 'rag_sources',
                        'sources': rag_sources
                    })
                    
                    # Continuer avec la génération de réponse normale
                    async for chunk in adapter.stream_response(messages, params):
                        if isinstance(chunk, str):
                            try:
                                # Essayer de parser pour voir si c'est déjà un JSON
                                json_chunk = json.loads(chunk)
                                yield format_sse_message(json_chunk)
                            except json.JSONDecodeError:
                                # Si ce n'est pas un JSON, l'envoyer comme un chunk normal
                                filtered_chunk = filter_thinking_content(chunk) if rag_info else chunk
                                yield format_sse_message({'type': 'chunk', 'data': filtered_chunk})
                        else:
                            yield format_sse_message(chunk)
                    
                    # Marquer la fin du stream
                    yield format_sse_message("[DONE]")
                    yield "event: done\ndata: {}\n\n"
                else:
                    print("Aucune source RAG disponible")
                    yield format_sse_message({'type': 'error', 'data': 'Aucun document pertinent trouvé'})
                    yield "event: error\ndata: {}\n\n"
            elif search_info:
                # Envoyer les informations de recherche immédiatement
                print(f"Informations de recherche disponibles: {search_info.get('query')}")
                yield format_sse_message({
                    'type': 'search_info',
                    'search_info': search_info
                })
                
                # Continuer avec la génération de réponse normale
                async for chunk in adapter.stream_response(messages, params):
                    if isinstance(chunk, str):
                        try:
                            # Tenter de parser le JSON pour s'assurer qu'il est valide
                            chunk_data = json.loads(chunk)
                            
                            # Ajouter des informations supplémentaires si nécessaires
                            if 'type' in chunk_data and chunk_data['type'] == 'chunk':
                                chunk_data['search_query'] = search_info.get('query')
                                if original_query:
                                    chunk_data['query'] = original_query
                            
                            yield format_sse_message(chunk_data)
                        except json.JSONDecodeError:
                            # Si ce n'est pas un JSON valide, l'envelopper
                            yield format_sse_message({
                                'type': 'chunk', 
                                'data': chunk,
                                'search_query': search_info.get('query')
                            })
                    else:
                        yield format_sse_message(chunk)
                
                # Marquer la fin du stream
                yield format_sse_message("[DONE]")
                yield "event: done\ndata: {}\n\n"
            else:
                # Génération de réponse standard
                async for chunk in adapter.stream_response(messages, params):
                    if isinstance(chunk, str):
                        try:
                            # Tenter de parser le JSON pour s'assurer qu'il est valide
                            chunk_data = json.loads(chunk)
                            yield format_sse_message(chunk_data)
                        except json.JSONDecodeError:
                            # Si ce n'est pas un JSON valide, l'envelopper
                            yield format_sse_message({'type': 'chunk', 'data': chunk})
                    else:
                        yield format_sse_message(chunk)
                
                # Marquer la fin du stream
                yield format_sse_message("[DONE]")
                yield "event: done\ndata: {}\n\n"
        
        except Exception as e:
            print(f"Erreur lors du streaming: {e}")
            yield format_sse_message({'type': 'error', 'data': f'Erreur: {str(e)}'})
            yield "event: error\ndata: {}\n\n"
    
    return EventSourceResponse(stream_generator())

# Additional endpoint to list available models
@app.get("/models")
async def list_models():
    """List all available GGUF models in the models directory"""
    try:
        models = []
        if os.path.exists(MODEL_DIR):
            for file in os.listdir(MODEL_DIR):
                if file.endswith(".gguf"):
                    model_path = os.path.join(MODEL_DIR, file)
                    model_size = os.path.getsize(model_path) / (1024 * 1024 * 1024)  # Size in GB
                    models.append({
                        "filename": file,
                        "path": model_path,
                        "size_gb": round(model_size, 2),
                        "is_active": model_path == MODEL_PATH
                    })
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to change the model
@app.post("/change-model")
async def change_model(model_request: ModelChangeRequest = None, model_file: str = Query(None)):
    """Change the active model - can be called with either query param or JSON body"""
    global model_instance, MODEL_PATH, model_info
    
    # Support both query parameters and request body
    if model_request is not None:
        model_file = model_request.model_file
        n_ctx = model_request.n_ctx
        n_batch = model_request.n_batch
        n_gpu_layers = model_request.n_gpu_layers
    else:
        if model_file is None:
            raise HTTPException(status_code=400, detail="No model file specified")
        n_ctx = 4096
        n_batch = 512
        n_gpu_layers = 0
    
    new_model_path = os.path.join(MODEL_DIR, model_file)
    
    if not os.path.exists(new_model_path):
        raise HTTPException(status_code=404, detail=f"Model file not found: {model_file}")
    
    try:
        # Unload current model
        model_instance = None
        
        # Update model info
        model_info = {
            "model_path": new_model_path,
            "load_time": None,
            "n_ctx": n_ctx,
            "n_batch": n_batch,
            "n_gpu_layers": n_gpu_layers,
            "model_type": "local",  # "local", "openai", "gemini", etc.
            "api_keys": {
                "openai": None,
                "gemini": None,
                "groq": None,
                "openrouter": None
            },
            "inference_stats": {
                "total_requests": 0,
                "avg_response_time": 0,
                "total_time": 0
            }
        }
        
        # Load new model
        start_time = datetime.now()
        model_instance = Llama(
            model_path=new_model_path,
            n_ctx=n_ctx,
            n_batch=n_batch,
            n_gpu_layers=n_gpu_layers
        )
        load_time = (datetime.now() - start_time).total_seconds()
        model_info["load_time"] = load_time
        
        MODEL_PATH = new_model_path
        return {
            "status": "Model changed successfully", 
            "model_path": MODEL_PATH,
            "model_name": os.path.basename(MODEL_PATH),
            "load_time": load_time,
            "n_ctx": n_ctx,
            "n_batch": n_batch
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Imports pour le système RAG
from fastapi import UploadFile, File, Form
from fastapi.responses import JSONResponse
import shutil
from rag import (
    RAGSystem as RagSystem, RagQuery, RagResponse, RagCollection, RagDocument,
    get_rag_system
)

# Classes pour les requêtes RAG
class RagUploadRequest(BaseModel):
    collection_name: str = "default"
    overwrite_existing: bool = False

class RagQueryRequest(BaseModel):
    query: str
    collection_name: str
    top_k: int = 5
    hybrid_search: bool = True
    use_in_prompt: bool = True
    filter: Optional[Dict] = None

class RagChat(BaseModel):
    query: str
    messages: List[ChatMessage]
    max_tokens: Optional[int] = MAX_TOKENS
    temperature: Optional[float] = TEMPERATURE
    top_p: Optional[float] = TOP_P
    frequency_penalty: Optional[float] = FREQUENCY_PENALTY
    presence_penalty: Optional[float] = PRESENCE_PENALTY
    collection_name: str
    top_k: int = 3
    use_stream: bool = False
    session_id: Optional[str] = None

# Endpoint pour récupérer la liste des collections RAG
@app.get("/rag/collections")
async def list_rag_collections():
    """
    Liste toutes les collections RAG disponibles
    """
    try:
        collections = get_rag_system().list_collections()
        return {"collections": [col.dict() for col in collections]}
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des collections RAG: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Endpoint pour créer une nouvelle collection RAG
@app.post("/rag/collections/{name}")
async def create_rag_collection(name: str, description: Optional[str] = None):
    """
    Crée une nouvelle collection RAG
    """
    try:
        # Vérifier si la collection existe déjà
        collections = get_rag_system().list_collections()
        if name in [col.name for col in collections]:
            return JSONResponse(
                status_code=400,
                content={"message": f"La collection '{name}' existe déjà"}
            )
        
        # Créer la collection en ajoutant un document vide
        from langchain_core.documents import Document
        empty_document = Document(page_content="", metadata={"source": "init"})
        
        rag_system = get_rag_system()
        vectorstore = Chroma(
            collection_name=name,
            embedding_function=rag_system.embedding_model,
            persist_directory=VECTORS_DIR
        )
        vectorstore.add_documents([empty_document])
        vectorstore.persist()
        
        return JSONResponse(
            status_code=201,
            content={"message": f"Collection '{name}' créée avec succès"}
        )
    except Exception as e:
        logging.error(f"Erreur lors de la création de la collection RAG: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Endpoint pour supprimer une collection RAG
@app.delete("/rag/collections/{name}")
async def delete_rag_collection(name: str):
    """
    Supprime une collection RAG
    """
    try:
        result = get_rag_system().delete_collection(name)
        if result:
            return {"message": f"Collection '{name}' supprimée avec succès"}
        else:
            return JSONResponse(
                status_code=400,
                content={"message": f"Impossible de supprimer la collection '{name}'"}
            )
    except Exception as e:
        logging.error(f"Erreur lors de la suppression de la collection RAG: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Endpoint pour télécharger et indexer un fichier
@app.post("/rag/upload")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Form("default")
):
    """
    Télécharge et indexe un fichier dans une collection RAG
    """
    try:
        # Vérifier si la collection existe
        collections = get_rag_system().list_collections()
        if collection_name not in [col.name for col in collections]:
            # Créer la collection si elle n'existe pas
            await create_rag_collection(collection_name)
        
        # Enregistrer le fichier temporairement
        temp_file_path = os.path.join(DOCUMENTS_DIR, file.filename)
        with open(temp_file_path, "wb") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
        
        # Indexer le fichier
        result = get_rag_system().process_file(temp_file_path, collection_name)
        
        return {
            "message": f"Fichier '{file.filename}' indexé avec succès",
            "document_id": result.id,
            "status": result.status,
            "chunks": len(result.chunks)
        }
    except Exception as e:
        logging.error(f"Erreur lors de l'upload et de l'indexation: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Endpoint pour interroger une collection RAG
@app.post("/rag/query")
async def query_rag_collection(request: RagQueryRequest):
    """
    Interroge une collection RAG
    """
    try:
        rag_query = RagQuery(
            query=request.query,
            collection_name=request.collection_name,
            top_k=request.top_k,
            hybrid_search=request.hybrid_search,
            filter=request.filter
        )
        
        response = get_rag_system().query(rag_query)
        
        return {
            "query": response.query,
            "contexts": response.contexts,
            "sources": response.sources,
            "elapsed_time": response.elapsed_time
        }
    except Exception as e:
        logging.error(f"Erreur lors de la requête RAG: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

def create_rag_system_prompt(context):
    """Crée un prompt système amélioré pour le RAG."""
    return (
        "Tu es TURBO PECH, un assistant pédagogique qui utilise des documents de référence pour donner des réponses précises.\n\n"
        "En tant qu'assistant, ta mission est de:\n"
        "1. Répondre aux questions en te basant EXCLUSIVEMENT sur les documents fournis ci-dessous\n"
        "2. CITER TES SOURCES explicitement avec la formulation \"Selon le Document X\" ou \"D'après le Document X\"\n"
        "3. Organiser ta réponse de manière claire et structurée, en extrayant les informations pertinentes\n"
        "4. Ne jamais inventer d'informations qui ne sont pas dans les documents\n"
        "5. Si les documents ne contiennent pas l'information demandée, dis simplement: \"Les documents ne contiennent pas suffisamment d'informations pour répondre à cette question.\"\n"
        "6. Répondre UNIQUEMENT en français\n"
        "7. NE JAMAIS exposer ton raisonnement interne ou ton processus de pensée\n"
        "8. NE JAMAIS expliquer ce que tu vas faire ou comment tu analyses la question\n"
        "9. NE JAMAIS commencer ta réponse par des phrases comme \"Voici ce que je trouve dans les documents\" ou \"En analysant les documents\"\n\n"
        f"DOCUMENTS DE RÉFÉRENCE:\n{context}\n\n"
        "IMPORTANT: Ta réponse DOIT être basée UNIQUEMENT sur ces documents. N'inclus PAS de connaissances externes.\n"
        "Si tu cites un document, indique TOUJOURS son numéro (Document 1, Document 2, etc.).\n"
        "REMARQUE FINALE: Passe directement à ta réponse sans aucun préambule. Ne commence PAS ta réponse par 'Selon les documents' ou 'D'après mon analyse'. Fournir directement l'information demandée en français."
    )

def create_rag_system_prompt_for_qwen(context):
    """Crée un prompt système simplifié pour les modèles Qwen qui ont du mal avec les instructions complexes."""
    return (
        "Tu es TURBO PECH, un assistant pédagogique qui aide les élèves avec des informations précises.\n\n"
        f"Voici des documents pertinents sur le sujet:\n\n{context}\n\n"
        "Utilise ces documents pour répondre clairement et de façon détaillée. "
        "Si les documents ne contiennent pas l'information demandée, dis-le simplement."
    )

def create_rag_system_prompt_for_gemini(context):
    """Crée un prompt système optimisé pour les modèles Gemini avec RAG."""
    return (
        "Tu es un assistant pédagogique répondant à des questions basées sur des documents de référence.\n\n"
        f"Voici les documents pertinents :\n\n{context}\n\n"
        "INSTRUCTIONS CRITIQUES:\n"
        "1. RÉPONDS DIRECTEMENT à la question posée en utilisant UNIQUEMENT les informations des documents ci-dessus\n"
        "2. Si tu trouves des informations pertinentes, organise-les dans une réponse COMPLÈTE et DÉTAILLÉE\n" 
        "3. Cite explicitement les numéros de documents (Document 1, Document 2, etc.)\n"
        "4. Si les documents ne contiennent PAS l'information demandée, dis simplement: \"Les documents ne contiennent pas d'information sur cette question.\"\n"
        "5. N'utilise PAS de connaissances extérieures aux documents fournis\n"
        "6. N'ajoute PAS de préambule ou d'explications sur ta façon de répondre\n"
        "7. Ne commence PAS ta réponse par 'Je vais analyser' ou 'Voici ce que je trouve'\n"
        "8. Réponds TOUJOURS en français, de façon directe et précise\n"
    )

@app.post("/rag/chat")
async def rag_chat(request: RagChat):
    """Chat with documents from a specific RAG collection"""
    global model_info
    
    collection_name = request.collection_name
    query = request.query
    
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    if not collection_name:
        raise HTTPException(status_code=400, detail="Collection name is required")
    
    try:
        # Initialize RAG system
        rag = get_rag_system()
        
        # Check if collection exists
        collections = rag.list_collections()
        collection_names = [col.name for col in collections]
        if collection_name not in collection_names:
            raise HTTPException(
                status_code=404, 
                detail=f"Collection '{collection_name}' not found"
            )
        
        # Use the query to search the collection
        rag_query = RagQuery(
            query=query,
            collection_name=collection_name,
            top_k=request.top_k,
            hybrid_search=True
        )
        
        rag_result = rag.query(rag_query)
        if not rag_result.contexts:
            return {
                "query": query,
                "collection": collection_name,
                "result": "No relevant documents found",
                "sources": [],
                "model_response": None
            }
            
        # Format sources for the prompt
        context = "Documents pertinents trouvés dans la base de connaissances :\n\n"
        for i, source in enumerate(rag_result.sources):
            context += f"DOCUMENT {i+1} :\n"
            context += f"{source['content']}\n"
            if source['metadata'] and "source" in source['metadata']:
                context += f"Source : {source['metadata']['source']}\n"
            context += "\n"
        
        # Format message list
        formatted_messages = []
        
        # Détecter le type de modèle utilisé
        is_qwen_model = False
        is_gemini_model = False
        
        if model_info["model_type"] == "gemini":
            is_gemini_model = True
            print(f"Modèle Gemini natif détecté pour RAG: {model_info['model_name']}")
        elif model_info["model_type"] == "openrouter" and model_info["model_name"]:
            if "qwen" in model_info["model_name"].lower():
                is_qwen_model = True
                print(f"Modèle Qwen détecté pour RAG: {model_info['model_name']}")
            elif "gemini" in model_info["model_name"].lower():
                is_gemini_model = True
                print(f"Modèle Gemini via OpenRouter détecté pour RAG: {model_info['model_name']}")
        
        # Préparer les messages pour les différents modèles
        if is_qwen_model:
            system_prompt = create_rag_system_prompt_for_qwen(context)
            print("Utilisation du prompt RAG simplifié pour Qwen")
            formatted_messages.append({"role": "system", "content": system_prompt})
        elif is_gemini_model:
            # Pour Gemini, créer une structure de messages différente - utiliser un user message au lieu d'un system message
            print("Utilisation du prompt RAG optimisé pour Gemini")
            # Ajouter un système basique pour définir le rôle global sans surcharger
            formatted_messages.append({"role": "system", "content": "Tu es un assistant pédagogique précis qui répond sur base de documents."})
            # Placer les instructions et le contexte dans le message utilisateur
            user_prompt = f"QUESTION: {query}\n\n{create_rag_system_prompt_for_gemini(context)}"
            formatted_messages.append({"role": "user", "content": user_prompt})
        else:
            system_prompt = create_rag_system_prompt(context)
            print("Utilisation du prompt RAG standard")
            formatted_messages.append({"role": "system", "content": system_prompt})
        
        # Add history messages if not Gemini (already handled in special format)
        if not is_gemini_model:
            for msg in request.messages:
                formatted_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
        # Use streaming if requested
        if request.use_stream:
            # Generate a session ID for streaming
            session_id = str(uuid.uuid4())
            
            # Format sources for sending via stream
            rag_sources = rag_result.sources
            
            # Store session data for the streaming endpoint
            stream_sessions[session_id] = {
                "messages": formatted_messages,
                "params": {
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "frequency_penalty": request.frequency_penalty,
                    "presence_penalty": request.presence_penalty
                },
                "rag_info": {
                    "query": query,
                    "collection": collection_name,
                    "sources": rag_sources
                },
                "expiry": datetime.now() + timedelta(minutes=5)
            }
            
            # Return session ID for streaming
            return {
                "status": "streaming",
                "session_id": session_id,
                "rag_info": {
                    "query": query,
                    "collection": collection_name,
                    "sources_count": len(rag_sources)
                }
            }
        
        # Pour les modèles Gemini, ajuster les paramètres pour des réponses plus précises
        params = {
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "frequency_penalty": request.frequency_penalty,
            "presence_penalty": request.presence_penalty
        }
        
        if is_gemini_model:
            # Ajuster les paramètres pour Gemini
            params["temperature"] = min(0.7, params["temperature"])  # Limiter la température pour plus de focus
            params["max_tokens"] = min(4000, params["max_tokens"] * 1.5)  # Plus de tokens pour des réponses détaillées
        
        # For non-streaming response
        adapter = get_model_adapter()
        start_time = time.time()
        
        # Tentative initiale de génération
        print(f"Envoi de la requête RAG au modèle avec {len(formatted_messages)} messages")
        response = await adapter.generate_response(formatted_messages, params)
        
        # Track inference stats
        model_info["inference_stats"]["total_requests"] += 1
        elapsed_time = time.time() - start_time
        model_info["inference_stats"]["total_time"] += elapsed_time
        model_info["inference_stats"]["avg_response_time"] = (
            model_info["inference_stats"]["total_time"] / model_info["inference_stats"]["total_requests"]
        )
        
        # Vérifier si la réponse du modèle est vide ou mal formatée
        is_valid_response = False
        content = ""
        
        if response:
            if "choices" in response and len(response["choices"]) > 0:
                message = response["choices"][0].get("message", {})
                content = message.get("content", "")
                if content and len(content.strip()) > 0:
                    # Filtrer le contenu pour éliminer le "thinking"
                    filtered_content = filter_thinking_content(content)
                    
                    # Mettre à jour le contenu filtré dans la réponse
                    response["choices"][0]["message"]["content"] = filtered_content
                    
                    # Vérifier que ce n'est pas juste une réponse générique ou vide
                    is_valid_content = len(filtered_content.strip()) > 30 and not (
                        "je n'ai pas pu" in filtered_content.lower() or 
                        "quelle est ta question" in filtered_content.lower() or
                        "les documents ne contiennent pas" in filtered_content.lower() and len(filtered_content) < 100
                    )
                    
                    is_valid_response = is_valid_content
                    if not is_valid_content:
                        print(f"Réponse jugée invalide ou générique: {filtered_content[:100]}...")
                    else:
                        print(f"Réponse valide générée, longueur: {len(filtered_content)}")
        
        # Pour les modèles Gemini - tentative avec une approche directe si la réponse est inadéquate
        if is_gemini_model and (not is_valid_response or len(content.strip()) < 100):
            print("Réponse inadéquate avec Gemini, tentative avec approche directe")
            
            # Approche beaucoup plus directe
            direct_context = "" 
            for i, source in enumerate(rag_result.sources):
                direct_context += f"Document {i+1}: {source['content']}\n\n"
            
            direct_prompt = (
                f"DOCUMENTS:\n{direct_context}\n\n"
                f"QUESTION: {query}\n\n"
                "INSTRUCTIONS: Réponds de façon directe et précise à la question en utilisant uniquement les documents fournis. "
                "Cite les documents pertinents par leur numéro. "
                "Si les documents ne contiennent pas l'information nécessaire, indique-le clairement."
            )
            
            direct_messages = [
                {"role": "user", "content": direct_prompt}
            ]
            
            print("Envoi de la requête directe à Gemini")
            retry_params = {
                "max_tokens": 4000,
                "temperature": 0.5,
                "top_p": 0.95,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0
            }
            
            retry_response = await adapter.generate_response(direct_messages, retry_params)
            
            if retry_response and "choices" in retry_response and len(retry_response["choices"]) > 0:
                retry_message = retry_response["choices"][0].get("message", {})
                retry_content = retry_message.get("content", "")
                
                if retry_content and len(retry_content.strip()) > 50:
                    print(f"Réponse obtenue avec approche directe, longueur: {len(retry_content)}")
                    response = retry_response
                    is_valid_response = True
        
        # Si la réponse est toujours invalide, créer une réponse de secours
        if not is_valid_response:
            print(f"Réponse invalide du modèle pour le RAG: {response}")
            
            # Créer une réponse de secours
            fallback_response = {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": "Je n'ai pas pu générer une réponse basée sur les documents fournis. Cependant, voici les sources pertinentes qui pourraient vous aider à répondre à votre question."
                    }
                }],
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0
                },
                "_fallback": True  # Marquer comme réponse de secours
            }
            
            response = fallback_response
            
        # Format sources for the response
        sources = []
        for source in rag_result.sources:
            # Transformer les sources en format compatible avec le frontend
            source_content = source.get('content', '')
            source_metadata = source.get('metadata', {})
            formatted_source = {
                'content': source_content,
                'metadata': source_metadata
            }
            sources.append(formatted_source)
        
        # Return response with RAG info
        return {
            "query": query,
            "collection": collection_name,
            "rag_info": {
                "collection": collection_name,
                "sources": sources,
                "count": len(sources)
            },
            "model_response": response
        }
        
    except Exception as e:
        print(f"Error in RAG chat: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error using RAG: {str(e)}")

# Endpoint pour créer rapidement une collection de test
@app.post("/rag/create-test-collection")
async def create_test_collection():
    """
    Crée une collection de test avec quelques documents d'exemple
    """
    try:
        collection_name = "test_collection"
        description = "Collection de test créée automatiquement"
        
        # Vérifier si la collection existe déjà
        collections = get_rag_system().list_collections()
        if collection_name in [col.name for col in collections]:
            # Supprimer la collection existante
            get_rag_system().delete_collection(collection_name)
        
        # Créer la collection
        from langchain_core.documents import Document
        
        # Créer quelques exemples de documents
        documents = [
            Document(
                page_content="""Python est un langage de programmation interprété, multi-paradigme et multiplateformes. 
                Il favorise la programmation impérative structurée, fonctionnelle et orientée objet. 
                Python est doté d'un typage dynamique fort, d'une gestion automatique de la mémoire et d'un système de gestion d'exceptions.""",
                metadata={"source": "test", "filename": "python_info.txt", "type": "programming"}
            ),
            Document(
                page_content="""Le théorème de Pythagore établit que dans un triangle rectangle, le carré de la longueur de l'hypoténuse
                est égal à la somme des carrés des longueurs des deux autres côtés. Soit a et b les longueurs des côtés et c la longueur de l'hypoténuse,
                alors a² + b² = c². Ce théorème est fondamental en géométrie euclidienne.""",
                metadata={"source": "test", "filename": "pythagore.txt", "type": "mathematics"}
            ),
            Document(
                page_content="""La photosynthèse est le processus utilisé par les plantes, les algues et certaines bactéries
                pour convertir l'énergie lumineuse en énergie chimique. Celle-ci est stockée sous forme de glucides
                et peut être mobilisée ultérieurement pour alimenter les activités cellulaires de l'organisme.""",
                metadata={"source": "test", "filename": "photosynthese.txt", "type": "biology"}
            ),
            Document(
                page_content="""La Révolution française est une période de bouleversements sociaux et politiques
                en France, dans ses colonies et en Europe à la fin du XVIIIe siècle. La période habituellement
                comprise s'étend entre l'ouverture des États généraux, le 5 mai 1789, et le coup d'État de
                Napoléon Bonaparte le 9 novembre 1799.""",
                metadata={"source": "test", "filename": "revolution_francaise.txt", "type": "history"}
            ),
            Document(
                page_content="""L'intelligence artificielle (IA) est un ensemble de théories et de techniques mises en œuvre
                en vue de réaliser des machines capables de simuler l'intelligence humaine. Elle correspond donc à un ensemble
                de concepts et de technologies plus qu'à une discipline autonome constituée.""",
                metadata={"source": "test", "filename": "intelligence_artificielle.txt", "type": "technology"}
            )
        ]
        
        # Créer la collection
        rag_system = get_rag_system()
        vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=rag_system.embedding_model,
            persist_directory=VECTORS_DIR
        )
        vectorstore.add_documents(documents)
        vectorstore.persist()
        
        return JSONResponse(
            status_code=201,
            content={
                "message": f"Collection de test '{collection_name}' créée avec succès",
                "document_count": len(documents),
                "topics": ["Python", "Pythagore", "Photosynthèse", "Révolution française", "Intelligence artificielle"]
            }
        )
    except Exception as e:
        logging.error(f"Erreur lors de la création de la collection de test: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Ajouter un nouvel endpoint pour accéder aux documents originaux
# Placer cet endpoint après les autres endpoints RAG

@app.get("/api/documents/{path:path}")
async def get_document(path: str):
    """
    Récupère un document à partir de son chemin pour l'affichage ou le téléchargement
    """
    try:
        # Sécuriser le chemin pour éviter les attaques de traversée de répertoire
        # S'assurer que le chemin est dans le répertoire des documents
        normalized_path = os.path.normpath(path)
        
        # Vérifier que le chemin est bien dans le répertoire des documents ou un sous-répertoire autorisé
        if os.path.isabs(normalized_path):
            file_path = normalized_path
        else:
            file_path = os.path.join(DOCUMENTS_DIR, normalized_path)
            
        # Vérifier que le fichier existe
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Document non trouvé: {path}")
        
        # Déterminer le type de contenu
        mime_type = mimetypes.guess_type(file_path)[0]
        if not mime_type:
            mime_type = "application/octet-stream"
            
        # Pour les PDFs et autres fichiers qui peuvent être affichés dans le navigateur
        if mime_type in ["application/pdf", "text/plain", "text/html", "image/jpeg", "image/png"]:
            return FileResponse(
                file_path, 
                media_type=mime_type, 
                filename=os.path.basename(file_path)
            )
        else:
            # Pour les autres types de fichiers, forcer le téléchargement
            return FileResponse(
                file_path, 
                media_type=mime_type,
                filename=os.path.basename(file_path)
            )
    except Exception as e:
        logging.error(f"Erreur lors de l'accès au document {path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# Classes pour Turbo Search
class TurboSearchRequest(BaseModel):
    """Requête pour la recherche Turbo Search"""
    query: str
    reformulate: bool = True
    max_results: int = 5
    safe_search: bool = True

class TurboSearchSettings(BaseModel):
    """Paramètres pour Turbo Search"""
    api_key: str

# Endpoint pour effectuer une recherche avec Turbo Search
@app.post("/search_duckduckgo_serpapi")
async def search_duckduckgo_serpapi(request: TurboSearchRequest):
    """Perform a web search using TurboSearch"""
    global model_info, model_adapter
    
    # Check if SerpAPI key is set
    if not model_info.get("serpapi_key"):
        raise HTTPException(
            status_code=400,
            detail="SerpAPI key not configured. Please set a SerpAPI key in settings."
        )
    
    try:
        # Create TurboSearch instance with the stored API key
        turbo_search = TurboSearch(serpapi_key=model_info.get("serpapi_key"))
        
        # Create the search query
        search_query = TsSearchQuery(
            query=request.query,
            reformulate=request.reformulate,
            max_results=request.max_results,
            safe_search=request.safe_search
        )
        
        # Get the model adapter
        adapter = get_model_adapter()
        
        # Perform the search
        result = turbo_search.search(search_query, adapter)
        
        # Convert to dict and return
        return {
            "query": result.query,
            "results": [r.dict() for r in result.results],
            "answer": result.answer,
            "reformulated_answer": result.reformulated_answer,
            "elapsed_time": result.elapsed_time,
            "total_results_count": result.total_results_count
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during TurboSearch: {str(e)}"
        )

# Endpoint pour configurer la clé API SerpAPI
@app.post("/set-serpapi-key")
async def set_serpapi_key(request: TurboSearchSettings):
    """Set SerpAPI key for Turbo Search"""
    global model_info
    
    try:
        # Valider que la clé API est présente
        if not request.api_key or not request.api_key.strip():
            raise HTTPException(
                status_code=400,
                detail="La clé API SerpAPI est requise"
            )
            
        # Sauvegarder la clé API dans model_info
        model_info["serpapi_key"] = request.api_key
        
        # Log des informations model_info après modification
        print(f"DEBUG: Après configuration de la clé SerpAPI, model_info: {model_info}")
        print(f"DEBUG: serpapi_key existe: {model_info.get('serpapi_key') is not None}")
        if model_info.get('serpapi_key'):
            print(f"DEBUG: serpapi_key configurée: {model_info.get('serpapi_key')[:5]}...")
        
        # Initialiser TurboSearch avec la nouvelle clé
        try:
            turbo_search = TurboSearch(serpapi_key=request.api_key)
            turbo_search.set_api_key(request.api_key)
            # Obtenir les statistiques d'utilisation sans faire de recherche
            stats = turbo_search.check_quota()
            print(f"DEBUG: TurboSearch initialisé avec succès, quota: {stats}")
        except Exception as e:
            print(f"Erreur lors de l'initialisation de TurboSearch: {str(e)}")
            # Continuer même en cas d'erreur, car la clé peut être valide
        
        # Sauvegarder la clé API dans un fichier
        with open("serpapi_available.txt", "w") as f:
            f.write("yes")
        
        # Log l'action
        print(f"Clé SerpAPI configurée avec succès: {request.api_key[:5]}...")
        
        return {"status": "SerpAPI key set successfully", "serpapi_key": request.api_key[:5] + "..."}
    except Exception as e:
        print(f"Erreur lors de la configuration de la clé SerpAPI: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la configuration de la clé API SerpAPI: {str(e)}"
        )

@app.get("/turbosearch-stats")
async def get_turbosearch_stats():
    """Get TurboSearch usage statistics"""
    global model_info
    
    try:
        # Vérifier si la clé API est configurée
        if not model_info.get("serpapi_key"):
            return {
                "monthly_quota": 100,
                "used": 0,
                "remaining": 0,
                "last_reset_date": None,
                "serpapi_key_configured": False
            }
            
        # Initialiser TurboSearch avec la clé existante
        try:
            turbo_search = TurboSearch(serpapi_key=model_info["serpapi_key"])
            stats = turbo_search.check_quota()
            stats["serpapi_key_configured"] = True
            return stats
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques TurboSearch: {str(e)}")
            return {
                "monthly_quota": 100,
                "used": 0,
                "remaining": 0,
                "last_reset_date": None,
                "error": str(e),
                "serpapi_key_configured": True
            }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques TurboSearch: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques TurboSearch: {str(e)}"
        )

# Nouvel endpoint pour effectuer une recherche web avec génération de réponse intégrée
@app.post("/chat-with-search")
async def chat_with_search(request: ChatRequest, search_query: str = Query(None)):
    """Generate a response with web search integration"""
    global model_info
    
    # Ajouter des logs pour déboguer
    print(f"DEBUG: Chat-with-search appelé avec search_query: {search_query}")
    print(f"DEBUG: model_info: {model_info}")
    print(f"DEBUG: serpapi_key existe: {model_info.get('serpapi_key') is not None}")
    if model_info.get('serpapi_key'):
        print(f"DEBUG: serpapi_key: {model_info.get('serpapi_key')[:5]}...")
    
    # Vérifier si la clé SerpAPI est configurée
    if not search_query:
        print("DEBUG: Pas de search_query, redirection vers l'endpoint chat standard")
        # Si pas de recherche demandée, utiliser l'endpoint de chat normal
        return await chat(request)
        
    if not model_info.get("serpapi_key"):
        print("DEBUG: serpapi_key non configurée, envoi d'une erreur 400")
        raise HTTPException(
            status_code=400,
            detail="Clé API SerpAPI non configurée. Veuillez configurer une clé SerpAPI."
        )
    
    try:
        # Effectuer la recherche web
        turbo_search = TurboSearch(serpapi_key=model_info.get("serpapi_key"))
        search_query_obj = TsSearchQuery(
            query=search_query,
            reformulate=True,
            max_results=5,
            safe_search=True
        )
        
        # Obtenir l'adaptateur de modèle
        adapter = get_model_adapter()
        
        # Effectuer la recherche
        search_result = turbo_search.search(search_query_obj, adapter)
        
        # Obtenir la date actuelle
        current_date = datetime.now().strftime("%d/%m/%Y")
        
        # Créer un prompt enrichi avec les résultats de recherche
        search_context = f"Résultats de recherche web pour la requête: \"{search_query}\" (obtenus le {current_date}):\n\n"
        
        # Ajouter chaque résultat au contexte
        for i, result in enumerate(search_result.results):
            search_context += f"{i+1}. {result.title}\n"
            search_context += f"   {result.snippet}\n"
            search_context += f"   Source: {result.link}\n\n"
            
        # Ajouter une réponse directe si disponible
        if search_result.reformulated_answer:
            search_context += f"Réponse synthétisée: {search_result.reformulated_answer}\n\n"
        elif search_result.answer:
            search_context += f"Réponse directe: {search_result.answer}\n\n"
            
        # Remplacer par un prompt plus détaillé pour l'analyse approfondie
        system_prompt = f"{SYSTEM_PROMPT}\n\n[INSTRUCTION: ANALYSE APPROFONDIE]\nTu as accès aux résultats de recherche web suivants pour la question: \"{search_query}\". Ta mission est de fournir une réponse complète, détaillée et utile à l'utilisateur.\n\nAujourd'hui, nous sommes le {current_date}. Utilise cette date comme point de référence pour toute information temporelle.\n\n{search_context}\n\nPrépare une réponse qui:\n1. Répond DIRECTEMENT et CLAIREMENT à la question posée\n2. Synthétise de façon approfondie les informations des sources en prenant position quand c'est nécessaire\n3. Donne des conclusions précises et des recommandations quand approprié\n4. Fournit des détails factuels précis (dates, chiffres, faits) issus des sources\n5. Organise l'information de façon structurée et cohérente\n6. UTILISE LA DATE D'AUJOURD'HUI ({current_date}) comme référence pour l'actualité\n\nIMPORTANT: Ne te contente pas de lister les sources ou de suggérer à l'utilisateur de les consulter. Fournis une RÉPONSE COMPLÈTE qui intègre les informations pertinentes. Sois informatif, précis et utile.\n\nN'hésite pas à argumenter et à prendre position sur la base des informations disponibles. Les utilisateurs comptent sur toi pour une réponse définitive et pas seulement un renvoi aux sources."
        
        # Remplacer ou ajouter un message système
        has_system_message = False
        formatted_msgs = []
        
        for msg in request.messages:
            if msg.role == "system":
                formatted_msgs.append({"role": "system", "content": system_prompt})
                has_system_message = True
            else:
                formatted_msgs.append({"role": msg.role, "content": msg.content})
        
        # Ajouter un message système si aucun n'est présent
        if not has_system_message:
            formatted_msgs.insert(0, {"role": "system", "content": system_prompt})
            
        # Générer la réponse avec le contexte de recherche
        if request.stream:
            # Stocker les messages dans la session pour la route /chat-stream
            session_id = str(uuid.uuid4())
            print(f"Creating new streaming session with search context, ID: {session_id}")
            
            # Normaliser les résultats de recherche pour être JSON serializable
            normalized_results = []
            for r in search_result.results:
                normalized_results.append({
                    "title": r.title,
                    "link": r.link,
                    "snippet": r.snippet,
                    "position": r.position,
                    "source": r.source,
                    "favicon": r.favicon,
                    "date": r.date
                })
            
            search_info = {
                "query": search_query,
                "results": normalized_results,
                "total_results": search_result.total_results_count,
                "elapsed_time": search_result.elapsed_time,
                "source": "turbosearch"
            }
            
            stream_sessions[session_id] = {
                "messages": formatted_msgs,
                "params": {
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "frequency_penalty": request.frequency_penalty,
                    "presence_penalty": request.presence_penalty
                },
                "search_info": search_info,
                "expiry": datetime.now() + timedelta(minutes=5)
            }
            
            return {"status": "streaming", "session_id": session_id, "search_info": search_info}
        else:
            start_time = datetime.now()
            
            # Générer une réponse non streaming
            adapter = get_model_adapter()
            response = await adapter.generate_response(formatted_msgs, {
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
                "top_p": request.top_p,
                "frequency_penalty": request.frequency_penalty,
                "presence_penalty": request.presence_penalty
            })
            
            # Normaliser les résultats de recherche pour être JSON serializable
            normalized_results = []
            for r in search_result.results:
                normalized_results.append({
                    "title": r.title,
                    "link": r.link,
                    "snippet": r.snippet,
                    "position": r.position,
                    "source": r.source,
                    "favicon": r.favicon,
                    "date": r.date
                })
            
            # Ajouter les informations de recherche à la réponse
            response["search_info"] = {
                "query": search_query,
                "results": normalized_results,
                "total_results": search_result.total_results_count,
                "elapsed_time": search_result.elapsed_time,
                "source": "turbosearch"
            }
            
            return response
    except Exception as e:
        print(f"Erreur lors de la génération de réponse avec recherche: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la génération de réponse avec recherche: {str(e)}"
        )

def filter_thinking_content(content):
    """
    Filtre le contenu pour éliminer les parties de "thinking" en anglais
    qui peuvent apparaître dans certaines réponses de modèles.
    """
    if not content or not isinstance(content, str):
        return content
    
    # Motifs typiques de "thinking" en anglais
    thinking_patterns = [
        r"Okay,\s+the\s+user\s+is\s+asking",
        r"Looking\s+at\s+the\s+documents",
        r"I\s+should\s+point\s+out",
        r"The\s+user\s+might\s+be\s+looking\s+for",
        r"I'll\s+provide",
        r"Let\s+me\s+check",
        r"Let's\s+analyze",
        r"I\s+need\s+to\s+clarify",
        r"I\s+will\s+now\s+provide",
        r"This\s+is\s+a\s+question\s+about",
        r"Based\s+on\s+the\s+provided\s+documents"
    ]
    
    # Vérifier s'il y a un bloc de thinking en anglais suivi d'une réponse en français
    # Recherche d'une transition entre un bloc en anglais et du français
    for pattern in thinking_patterns:
        match = re.search(pattern, content)
        if match:
            # Chercher le début d'une phrase en français après le bloc anglais
            french_starts = [
                r"Les\s+documents", r"D'après", r"Selon", r"Dans\s+le", r"Le\s+document",
                r"Il\s+y\s+a", r"Il\s+n'y\s+a", r"Il\s+s'agit", r"Voici", r"Pour", r"En\s+ce\s+qui"
            ]
            
            # Trouver où commence le français
            for fr_start in french_starts:
                fr_match = re.search(fr_start, content[match.start():])
                if fr_match:
                    # Extraire uniquement la partie en français
                    french_content = content[match.start() + fr_match.start():].strip()
                    return french_content
            
            # Si on détecte du thinking mais pas clairement de transition vers le français
            # essayer de détecter une séparation de paragraphe
            paragraph_splits = re.split(r"\n\n+", content[match.start():])
            if len(paragraph_splits) > 1:
                # Prendre le dernier paragraphe, qui est probablement la réponse finale
                return paragraph_splits[-1].strip()
    
    # Si aucun modèle de thinking n'est détecté, retourner le contenu original
    return content

# Utiliser cette fonction dans le traitement des réponses RAG

# Initialiser le gestionnaire de quiz
quiz_manager = QuizManager()

# Endpoints pour Turbo Quizz
@app.post("/quizzes/generate")
async def generate_quiz(request: QuizGenerationRequest):
    """Générer un nouveau quiz avec l'IA"""
    global quiz_manager
    
    # Configurer l'adaptateur de modèle pour la génération
    quiz_manager.set_model_adapter(get_model_adapter())
    
    try:
        quiz = await quiz_manager.generate_quiz(request)
        return {
            "status": "success",
            "quiz": quiz
        }
    except Exception as e:
        print(f"Erreur lors de la génération du quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quizzes")
async def list_quizzes(
    subject: str = None,
    grade_level: str = None
):
    """Lister tous les quiz disponibles avec filtres optionnels"""
    filters = {}
    if subject:
        filters["subject"] = subject
    if grade_level:
        filters["grade_level"] = grade_level
        
    quizzes = quiz_manager.list_quizzes(filters if filters else None)
    
    # Simplifier la réponse pour ne pas retourner toutes les questions
    simplified_quizzes = []
    for quiz in quizzes:
        simplified = {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "subject": quiz.subject,
            "grade_level": quiz.grade_level,
            "question_count": len(quiz.questions),
            "created_at": quiz.created_at,
            "duration_minutes": quiz.duration_minutes
        }
        simplified_quizzes.append(simplified)
    
    return {"quizzes": simplified_quizzes}

@app.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str):
    """Récupérer un quiz spécifique par son ID"""
    quiz = quiz_manager.get_quiz(quiz_id)
    
    if not quiz:
        raise HTTPException(status_code=404, detail=f"Quiz avec ID {quiz_id} non trouvé")
    
    return {"quiz": quiz}

@app.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str):
    """Supprimer un quiz par son ID"""
    success = quiz_manager.delete_quiz(quiz_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Quiz avec ID {quiz_id} non trouvé")
    
    return {"status": "success", "message": f"Quiz {quiz_id} supprimé"}

@app.post("/quizzes/attempts/start")
async def start_quiz_attempt(
    quiz_id: str = Form(...),
    student_id: str = Form(...),
    student_name: str = Form(...)
):
    """Démarrer une tentative de quiz"""
    quiz = quiz_manager.get_quiz(quiz_id)
    
    if not quiz:
        raise HTTPException(status_code=404, detail=f"Quiz avec ID {quiz_id} non trouvé")
    
    # Créer une nouvelle tentative
    attempt = QuizAttempt(
        id=str(uuid.uuid4()),
        quiz_id=quiz_id,
        student_id=student_id,
        student_name=student_name,
        answers=[-1] * len(quiz.questions),  # Initialiser avec des réponses vides
        score=0.0,
        completed=False,
        started_at=datetime.now().isoformat()
    )
    
    # Sauvegarder la tentative
    quiz_manager.save_attempt(attempt)
    
    return {
        "status": "success",
        "attempt_id": attempt.id,
        "quiz_id": quiz_id,
        "student_id": student_id,
        "started_at": attempt.started_at
    }

@app.post("/quizzes/attempts/{attempt_id}/submit")
async def submit_quiz_attempt(
    attempt_id: str,
    answers: List[int] = Body(...)
):
    """Soumettre les réponses d'une tentative de quiz"""
    attempt = quiz_manager.get_attempt(attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Tentative avec ID {attempt_id} non trouvée")
    
    # Mettre à jour les réponses
    attempt.answers = answers
    attempt.completed = True
    attempt.completed_at = datetime.now().isoformat()
    
    # Sauvegarder la tentative
    quiz_manager.save_attempt(attempt)
    
    # Calculer les résultats
    results = quiz_manager.calculate_quiz_result(attempt_id)
    
    if not results:
        raise HTTPException(status_code=500, detail="Erreur lors du calcul des résultats")
    
    return {
        "status": "success",
        "result": results
    }

@app.get("/quizzes/attempts/{attempt_id}")
async def get_quiz_attempt(attempt_id: str):
    """Récupérer les détails d'une tentative de quiz"""
    attempt = quiz_manager.get_attempt(attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Tentative avec ID {attempt_id} non trouvée")
    
    return {"attempt": attempt}

@app.get("/quizzes/results/{attempt_id}")
async def get_quiz_results(attempt_id: str):
    """Récupérer les résultats détaillés d'une tentative de quiz"""
    results = quiz_manager.calculate_quiz_result(attempt_id)
    
    if not results:
        raise HTTPException(status_code=404, detail=f"Résultats pour la tentative {attempt_id} non trouvés")
    
    return {"results": results}

@app.get("/students/{student_id}/progress")
async def get_student_progress(student_id: str):
    """Récupérer le rapport de progression d'un élève"""
    progress = quiz_manager.get_student_progress(student_id)
    
    if not progress:
        raise HTTPException(status_code=404, detail=f"Données de progression pour l'élève {student_id} non trouvées")
    
    return {"progress": progress}

@app.get("/subjects")
async def list_subjects():
    """Lister toutes les matières disponibles pour les quiz"""
    quizzes = quiz_manager.list_quizzes()
    subjects = set()
    
    for quiz in quizzes:
        subjects.add(quiz.subject)
    
    return {"subjects": list(subjects)}

@app.get("/grade-levels")
async def list_grade_levels():
    """Lister tous les niveaux scolaires disponibles pour les quiz"""
    quizzes = quiz_manager.list_quizzes()
    grade_levels = set()
    
    for quiz in quizzes:
        grade_levels.add(quiz.grade_level)
    
    return {"grade_levels": list(grade_levels)}

@app.delete("/api/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str):
    """Delete a specific quiz"""
    try:
        success = quiz_manager.delete_quiz(quiz_id)
        if success:
            return {"status": "success", "message": "Quiz deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Quiz not found")
    except Exception as e:
        print(f"Error deleting quiz: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting quiz: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 