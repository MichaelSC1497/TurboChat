#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Module Turbo Search pour TurboChat

Ce module fournit des fonctionnalités de recherche web en temps réel
pour enrichir les réponses avec des informations actualisées.
"""

import os
import json
import time
import requests
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("turbosearch")

# Configuration de l'API
DEFAULT_SERPAPI_ENDPOINT = "https://serpapi.com/search"
DUCKDUCKGO_ENGINE = "duckduckgo"
DEFAULT_MAX_RESULTS = 5  # Nombre maximal de résultats par défaut
QUOTA_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "turbosearch_quota.json")

class SearchResult(BaseModel):
    """Modèle pour un résultat de recherche individuel"""
    title: str
    link: str
    snippet: str
    position: int
    source: str = "DuckDuckGo"
    favicon: Optional[str] = None
    date: Optional[str] = None

class SearchResponse(BaseModel):
    """Modèle pour une réponse de recherche complète"""
    query: str
    results: List[SearchResult]
    answer: Optional[str] = None
    reformulated_answer: Optional[str] = None
    elapsed_time: float = 0.0
    total_results_count: int = 0
    api_credits_used: int = 1

class SearchQuery(BaseModel):
    """Modèle pour une requête de recherche"""
    query: str
    reformulate: bool = True
    max_results: int = DEFAULT_MAX_RESULTS
    safe_search: bool = True
    region: str = "fr-fr"  # Région par défaut (France)

class TurboSearchConfig(BaseModel):
    """Configuration pour Turbo Search"""
    api_key: Optional[str] = None
    endpoint: str = DEFAULT_SERPAPI_ENDPOINT
    engine: str = DUCKDUCKGO_ENGINE
    monthly_quota: int = 100
    usage_count: int = 0
    last_reset_date: Optional[str] = None
    search_history: List[Dict[str, Any]] = Field(default_factory=list)

class TurboSearch:
    """
    Système de recherche web Turbo Search pour TurboChat
    
    Utilise l'API SerpAPI pour effectuer des recherches Google
    et retourner des résultats formatés.
    """
    
    def __init__(self, serpapi_key: Optional[str] = None):
        """
        Initialise le système de recherche Turbo Search
        
        Args:
            serpapi_key: Clé API SerpAPI (optionnelle)
        """
        # Initialiser la configuration
        self.config = self._load_config()
        
        # Définir la clé API si fournie
        if serpapi_key:
            self.config.api_key = serpapi_key
            self._save_config()
            
        logger.info("Système Turbo Search initialisé")
    
    def _load_config(self) -> TurboSearchConfig:
        """
        Charge la configuration depuis le fichier
        
        Returns:
            Configuration Turbo Search
        """
        # Créer le répertoire de données s'il n'existe pas
        os.makedirs(os.path.dirname(QUOTA_FILE_PATH), exist_ok=True)
        
        # Charger la configuration si le fichier existe
        if os.path.exists(QUOTA_FILE_PATH):
            try:
                with open(QUOTA_FILE_PATH, 'r') as f:
                    config_data = json.load(f)
                    return TurboSearchConfig(**config_data)
            except Exception as e:
                logger.error(f"Erreur lors du chargement de la configuration: {e}")
        
        # Retourner une configuration par défaut
        return TurboSearchConfig()
    
    def _save_config(self) -> None:
        """Sauvegarde la configuration dans le fichier"""
        try:
            with open(QUOTA_FILE_PATH, 'w') as f:
                json.dump(self.config.dict(), f, indent=2)
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde de la configuration: {e}")
    
    def set_api_key(self, api_key: str) -> bool:
        """
        Définit la clé API SerpAPI
        
        Args:
            api_key: Clé API SerpAPI
            
        Returns:
            True si la clé a été définie avec succès
        """
        if not api_key or not isinstance(api_key, str):
            logger.error("Clé API invalide")
            return False
        
        self.config.api_key = api_key
        self._save_config()
        logger.info("Clé API SerpAPI définie avec succès")
        return True
    
    def check_quota(self) -> Dict[str, Any]:
        """
        Vérifie le quota d'utilisation et réinitialise si nécessaire
        
        Returns:
            Informations sur le quota
        """
        # Vérifier si un mois s'est écoulé depuis la dernière réinitialisation
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        if self.config.last_reset_date:
            last_reset = datetime.strptime(self.config.last_reset_date, "%Y-%m-%d")
            current = datetime.now()
            
            # Réinitialiser le compteur si un nouveau mois a commencé
            if (current.year > last_reset.year or 
                (current.year == last_reset.year and current.month > last_reset.month)):
                self.config.usage_count = 0
                self.config.last_reset_date = current_date
                self._save_config()
        else:
            # Initialiser la date de réinitialisation
            self.config.last_reset_date = current_date
            self._save_config()
        
        # Calculer le quota restant
        remaining = max(0, self.config.monthly_quota - self.config.usage_count)
        
        return {
            "monthly_quota": self.config.monthly_quota,
            "used": self.config.usage_count,
            "remaining": remaining,
            "last_reset_date": self.config.last_reset_date
        }
    
    def search(self, query: SearchQuery, model_adapter=None) -> SearchResponse:
        """
        Effectue une recherche web via SerpAPI et formate les résultats
        
        Args:
            query: Requête de recherche
            model_adapter: Adaptateur de modèle pour reformuler les réponses (optionnel)
            
        Returns:
            Réponse de recherche formatée
        """
        start_time = time.time()
        
        # Vérifier que la clé API est définie
        if not self.config.api_key:
            raise ValueError("Clé API SerpAPI non définie. Veuillez configurer une clé API dans les paramètres.")
        
        # Vérifier le quota
        quota_info = self.check_quota()
        if quota_info["remaining"] <= 0:
            raise ValueError("Quota mensuel SerpAPI épuisé (100 requêtes/mois). Veuillez réessayer le mois prochain.")
        
        # Construire les paramètres de recherche pour DuckDuckGo via SerpAPI
        params = {
            "engine": self.config.engine,
            "q": query.query,
            "api_key": self.config.api_key,
            "safe": "1" if query.safe_search else "0",
            "gl": query.region.split('-')[1] if '-' in query.region else "fr",
            "hl": query.region.split('-')[0] if '-' in query.region else "fr"
        }
        
        logger.info(f"Recherche Turbo Search pour: '{query.query}'")
        
        try:
            # Effectuer la requête à l'API SerpAPI
            response = requests.get(self.config.endpoint, params=params)
            response.raise_for_status()
            
            # Analyser la réponse JSON
            data = response.json()
            
            # Extraire les résultats de recherche organiques
            organic_results = data.get("organic_results", [])
            
            # Limiter le nombre de résultats
            results = []
            for i, result in enumerate(organic_results[:query.max_results]):
                # Extraire la date si disponible
                date = None
                if "date" in result:
                    date = result["date"]
                elif "snippet_highlighted_words" in result and "date" in result.get("snippet_highlighted_words", []):
                    date = result["snippet_highlighted_words"]["date"]
                
                # Créer le résultat formaté
                results.append(SearchResult(
                    title=result.get("title", ""),
                    link=result.get("link", ""),
                    snippet=result.get("snippet", ""),
                    position=i+1,
                    favicon=result.get("favicon", None),
                    date=date
                ))
            
            # Extraire une réponse directe si disponible
            answer = None
            if "answer_box" in data and isinstance(data["answer_box"], dict):
                answer_box = data["answer_box"]
                if "answer" in answer_box:
                    answer = answer_box["answer"]
                elif "snippet" in answer_box:
                    answer = answer_box["snippet"]
                elif "title" in answer_box:
                    answer = answer_box["title"]
            
            # Calculer le temps écoulé
            elapsed_time = time.time() - start_time
            
            # Créer la réponse de base
            search_response = SearchResponse(
                query=query.query,
                results=results,
                answer=answer,
                elapsed_time=elapsed_time,
                total_results_count=len(organic_results)
            )
            
            # Mettre à jour le compteur d'utilisation
            self.config.usage_count += 1
            
            # Ajouter à l'historique des recherches
            search_entry = {
                "timestamp": datetime.now().isoformat(),
                "query": query.query,
                "num_results": len(results),
                "elapsed_time": elapsed_time
            }
            self.config.search_history.append(search_entry)
            
            # Limiter l'historique à 100 entrées
            if len(self.config.search_history) > 100:
                self.config.search_history = self.config.search_history[-100:]
            
            # Sauvegarder la configuration mise à jour
            self._save_config()
            
            # Reformuler les résultats si demandé et si un adaptateur de modèle est fourni
            if query.reformulate and model_adapter:
                search_response.reformulated_answer = self._reformulate_results(
                    query.query, search_response, model_adapter
                )
            
            logger.info(f"Recherche Turbo Search terminée en {elapsed_time:.2f}s avec {len(results)} résultats")
            return search_response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la requête SerpAPI: {e}")
            raise ValueError(f"Erreur lors de la requête SerpAPI: {str(e)}")
        except Exception as e:
            logger.error(f"Erreur inattendue lors de la recherche: {e}")
            raise ValueError(f"Erreur inattendue lors de la recherche: {str(e)}")
    
    def _reformulate_results(self, query: str, search_response: SearchResponse, model_adapter) -> str:
        """
        Reformule les résultats de recherche en utilisant un modèle de langage
        
        Args:
            query: Requête de recherche originale
            search_response: Réponse de recherche à reformuler
            model_adapter: Adaptateur de modèle pour générer la reformulation
            
        Returns:
            Réponse reformulée
        """
        if not model_adapter:
            logger.warning("Pas d'adaptateur de modèle fourni pour la reformulation")
            return None
            
        try:
            # Préparer le contexte des résultats de recherche
            search_context = f"Résultats de recherche pour la requête: \"{query}\"\n\n"
            
            # Ajouter chaque résultat au contexte
            for i, result in enumerate(search_response.results):
                search_context += f"{i+1}. {result.title}\n"
                search_context += f"   {result.snippet}\n"
                search_context += f"   Source: {result.link}\n\n"
                
            # Créer un prompt pour le modèle
            reformulation_prompt = f"""Tu es un assistant de recherche spécialisé dans la synthèse d'informations.
            
Voici les résultats d'une recherche web pour la requête: "{query}"

{search_context}

Basé sur ces résultats de recherche, rédige une réponse complète, détaillée et bien structurée à la question originale. Ta réponse doit:
1. Synthétiser les informations pertinentes des différentes sources
2. Être factuelle et objective, en évitant les spéculations
3. Citer explicitement les sources quand pertinent [Source X]
4. Être organisée avec des paragraphes thématiques et/ou des listes si approprié
5. Aborder tous les aspects importants de la question

Ta réponse:"""

            # Créer un message système et utilisateur
            messages = [
                {"role": "system", "content": "Tu es un assistant de recherche spécialisé dans la synthèse d'informations issues de recherches web. Ta mission est de fournir des réponses complètes, précises et bien structurées."},
                {"role": "user", "content": reformulation_prompt}
            ]
            
            # Générer la reformulation (méthode asynchrone doit être traitée correctement)
            logger.info("Génération de la reformulation avec le LLM...")
            
            # Utiliser une approche qui ne tente pas de créer une nouvelle boucle d'événements
            # si une boucle est déjà en cours d'exécution
            
            import asyncio
            
            try:
                # Essayer d'obtenir la boucle d'événements actuelle
                loop = asyncio.get_event_loop()
                
                # Vérifier si nous sommes déjà dans une coroutine
                if loop.is_running():
                    # Simplement retourner None si nous sommes dans une coroutine active
                    # au lieu d'essayer d'exécuter une autre coroutine de façon synchrone
                    logger.warning("Une boucle d'événements est déjà en cours d'exécution. Impossible de reformuler les résultats de façon synchrone.")
                    return None
                else:
                    # Si la boucle n'est pas en cours d'exécution, exécuter normalement
                    response = loop.run_until_complete(model_adapter.generate_response(messages, {
                        "max_tokens": 1000,
                        "temperature": 0.7
                    }))
            except RuntimeError:
                # Si nous ne pouvons pas obtenir la boucle actuelle, créer une nouvelle
                logger.warning("Impossible d'obtenir la boucle d'événements actuelle. Création d'une nouvelle boucle.")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                response = loop.run_until_complete(model_adapter.generate_response(messages, {
                    "max_tokens": 1000,
                    "temperature": 0.7
                }))
            
            # Extraire la réponse reformulée
            if response and "choices" in response and len(response["choices"]) > 0:
                reformulated_answer = response["choices"][0]["message"]["content"]
                return reformulated_answer
            else:
                logger.error(f"Format de réponse inattendu lors de la reformulation: {response}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur lors de la reformulation des résultats: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """
        Obtient les statistiques d'utilisation
        
        Returns:
            Statistiques d'utilisation
        """
        # Vérifier et mettre à jour le quota
        quota_info = self.check_quota()
        
        # Ajouter l'historique des recherches
        stats = {
            **quota_info,
            "history": self.config.search_history[-10:]  # 10 dernières recherches
        }
        
        return stats 