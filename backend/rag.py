#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Module RAG (Retrieval-Augmented Generation) pour TurboChat

Ce module fournit les fonctionnalités pour :
- Indexation et recherche de documents
- Génération de réponses enrichies par les documents
- Gestion des embeddings vectoriels
"""

import os
import time
import logging
import uuid
from typing import List, Dict, Any, Optional, Union, Tuple

import chromadb
import numpy as np
import tiktoken
from pydantic import BaseModel
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings.base import Embeddings
from langchain.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
    UnstructuredHTMLLoader,
    CSVLoader,
    Docx2txtLoader
)
from langchain_core.documents import Document
from langchain.retrievers import BM25Retriever, EnsembleRetriever
from tqdm import tqdm

# Importer explicitement ces classes pour les rendre accessibles à l'importation
# depuis d'autres modules comme app.py
from langchain_core.documents import Document
from langchain.vectorstores import Chroma

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("turbochat-rag")

# Chemins pour les données
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DOCUMENTS_DIR = os.path.join(DATA_DIR, "documents")
INDICES_DIR = os.path.join(DATA_DIR, "indices")
VECTORS_DIR = os.path.join(DATA_DIR, "vectors")

# Exportation des variables pour les import externes
__all__ = ["RagSystem", "get_rag_system", "RagQuery", "RagResponse", "RagCollection", "RagDocument", "VECTORS_DIR"]

# Création des répertoires s'ils n'existent pas
os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(INDICES_DIR, exist_ok=True)
os.makedirs(VECTORS_DIR, exist_ok=True)

# Modèle de données pour les documents
class RagDocument(BaseModel):
    """
    Modèle pour un document RAG à indexer
    """
    id: str
    filename: str
    content: Optional[str] = None
    metadata: dict = {}
    chunks: List[Dict] = []
    status: str = "pending"  # pending, processing, indexed, failed

class RagQuery(BaseModel):
    """
    Modèle pour une requête RAG
    """
    query: str
    collection_name: str
    top_k: int = 5
    hybrid_search: bool = True
    filter: Optional[Dict] = None

class RagResponse(BaseModel):
    """
    Modèle pour une réponse RAG
    """
    query: str
    contexts: List[str]
    sources: List[Dict]
    elapsed_time: float = 0.0

class RagCollection(BaseModel):
    """
    Modèle pour une collection RAG
    """
    name: str
    description: Optional[str] = None
    document_count: int = 0
    chunk_count: int = 0
    last_updated: Optional[str] = None

def get_loader_for_file(file_path: str) -> Any:
    """
    Renvoie le chargeur approprié en fonction de l'extension du fichier
    
    Args:
        file_path: Chemin vers le fichier à charger
        
    Returns:
        Un chargeur Langchain pour le type de fichier spécifié
    """
    ext = file_path.split('.')[-1].lower()
    
    if ext == 'pdf':
        return PyPDFLoader(file_path)
    elif ext == 'txt':
        return TextLoader(file_path)
    elif ext in ['md', 'markdown']:
        return UnstructuredMarkdownLoader(file_path)
    elif ext in ['html', 'htm']:
        return UnstructuredHTMLLoader(file_path)
    elif ext == 'csv':
        return CSVLoader(file_path)
    elif ext in ['doc', 'docx']:
        return Docx2txtLoader(file_path)
    else:
        # Format non supporté, on tente avec TextLoader
        logger.warning(f"Format de fichier non reconnu: {ext}. Tentative avec TextLoader.")
        return TextLoader(file_path)

class SimpleEmbeddings(Embeddings):
    """
    Embeddings simplifiés qui utilisent une représentation basique pour les tests
    """
    
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Créer des embeddings de documents"""
        return [self._get_embedding(text) for text in texts]
    
    def embed_query(self, text: str) -> List[float]:
        """Créer un embedding de requête"""
        return self._get_embedding(text)
    
    def _get_embedding(self, text: str) -> List[float]:
        """Méthode interne de génération d'embedding simplifiée"""
        # Hachage simple basé sur le texte
        hash_val = hash(text) % (10**8)
        # Convertir en une liste de valeurs pseudo-aléatoires mais déterministes
        result = []
        for i in range(self.dimension):
            val = ((hash_val + i) * 1.0) / (10**8)
            result.append(val - 0.5)  # Valeurs entre -0.5 et 0.5
        
        # Normaliser le vecteur
        norm = sum(x*x for x in result) ** 0.5
        return [x/norm for x in result]

class RAGSystem:
    """
    Système RAG (Retrieval-Augmented Generation) pour TurboChat
    
    Cette classe gère l'indexation de documents et la recherche sémantique
    pour enrichir les réponses des modèles de langage.
    """
    
    def __init__(self):
        """
        Initialise le système RAG avec les paramètres par défaut
        """
        # Configuration du splitter de texte
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,           # Taille maximale d'un chunk en caractères
            chunk_overlap=200,         # Chevauchement entre chunks en caractères
            length_function=len,       # Fonction pour calculer la longueur
            separators=["\n\n", "\n", " ", ""]  # Séparateurs pour le découpage
        )
        
        # Modèle d'embedding
        self.embedding_model = SimpleEmbeddings()
        
        # Dictionnaire pour stocker les Vector Stores en mémoire
        self.vectorstores = {}
        
        # Client ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=VECTORS_DIR)
        
        logger.info("Système RAG initialisé avec succès")

    def list_collections(self) -> List[RagCollection]:
        """
        Liste toutes les collections disponibles
        
        Returns:
            Liste des collections RAG
        """
        collections = []
        for col in self.chroma_client.list_collections():
            col_name = col.name
            try:
                collection = self.chroma_client.get_collection(col_name)
                document_count = len(set([m.get('source', '') for m in collection.get()['metadatas'] or []]))
                chunk_count = collection.count()
                
                collections.append(RagCollection(
                    name=col_name,
                    document_count=document_count,
                    chunk_count=chunk_count
                ))
            except Exception as e:
                logger.error(f"Erreur lors de la récupération de la collection {col_name}: {e}")
        
        return collections

    def process_file(self, file_path: str, collection_name: str) -> RagDocument:
        """
        Traite un fichier pour l'indexation
        
        Args:
            file_path: Chemin vers le fichier à traiter
            collection_name: Nom de la collection dans laquelle indexer le document
            
        Returns:
            Document RAG créé
        """
        start_time = time.time()
        
        # Vérification que le fichier existe
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Le fichier {file_path} n'a pas été trouvé")
        
        # Création d'un ID unique pour le document
        doc_id = str(uuid.uuid4())
        filename = os.path.basename(file_path)
        
        # Initialisation du document RAG
        rag_doc = RagDocument(
            id=doc_id,
            filename=filename,
            metadata={
                "source": file_path,
                "filename": filename,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            status="processing"
        )
        
        try:
            # Utilisation du chargeur approprié
            loader = get_loader_for_file(file_path)
            documents = loader.load()
            logger.info(f"Fichier {filename} chargé avec succès: {len(documents)} pages/sections")
            
            # Découpage en chunks
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Document découpé en {len(chunks)} chunks")
            
            # Stockage des chunks dans le document RAG
            rag_doc.chunks = [{
                "id": str(uuid.uuid4()),
                "content": chunk.page_content,
                "metadata": {**chunk.metadata, **rag_doc.metadata}
            } for chunk in chunks]
            
            # Création ou mise à jour de la collection ChromaDB
            self._add_to_vectorstore(chunks, collection_name)
            
            # Mise à jour du statut
            rag_doc.status = "indexed"
            logger.info(f"Document {filename} indexé avec succès en {time.time() - start_time:.2f} secondes")
            
            return rag_doc
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement du fichier {filename}: {str(e)}")
            rag_doc.status = "failed"
            rag_doc.metadata["error"] = str(e)
            return rag_doc

    def _add_to_vectorstore(self, chunks: List[Document], collection_name: str) -> None:
        """
        Ajoute des chunks à une collection du vectorstore
        
        Args:
            chunks: Liste des chunks à ajouter
            collection_name: Nom de la collection
        """
        # Création du vectorstore s'il n'existe pas déjà
        try:
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=self.embedding_model,
                persist_directory=VECTORS_DIR
            )
            
            # Ajout des documents
            vectorstore.add_documents(chunks)
            
            # Persistance
            vectorstore.persist()
            
            # Stockage du vectorstore en mémoire
            self.vectorstores[collection_name] = vectorstore
            
            logger.info(f"Collection {collection_name} mise à jour avec {len(chunks)} nouveaux chunks")
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout à la collection {collection_name}: {str(e)}")
            raise

    def query(self, rag_query: RagQuery) -> RagResponse:
        """
        Interroge une collection RAG pour trouver du contexte pertinent
        
        Args:
            rag_query: Requête RAG
            
        Returns:
            Réponse RAG avec le contexte et les sources
        """
        start_time = time.time()
        
        try:
            # Récupérer la collection
            if rag_query.collection_name not in [col.name for col in self.list_collections()]:
                raise ValueError(f"Collection '{rag_query.collection_name}' non trouvée")
            
            # Charger le vectorstore s'il n'est pas déjà en mémoire
            if rag_query.collection_name not in self.vectorstores:
                self.vectorstores[rag_query.collection_name] = Chroma(
                    collection_name=rag_query.collection_name,
                    embedding_function=self.embedding_model,
                    persist_directory=VECTORS_DIR
                )
            
            vectorstore = self.vectorstores[rag_query.collection_name]
            
            # Créer un retriever BM25 pour la recherche hybride
            if rag_query.hybrid_search:
                # Récupérer tous les documents de la collection
                documents = vectorstore.get()["documents"]
                metadatas = vectorstore.get()["metadatas"]
                ids = vectorstore.get()["ids"]
                
                # Créer des objets Document pour le retriever BM25
                langchain_docs = []
                for i, doc in enumerate(documents):
                    langchain_docs.append(Document(
                        page_content=doc,
                        metadata=metadatas[i] if metadatas and i < len(metadatas) else {}
                    ))
                
                # Créer le retriever BM25
                bm25_retriever = BM25Retriever.from_documents(langchain_docs)
                bm25_retriever.k = rag_query.top_k
                
                # Créer un retriever pour le vectorstore
                vector_retriever = vectorstore.as_retriever(search_kwargs={"k": rag_query.top_k})
                
                # Créer un retriever d'ensemble
                ensemble_retriever = EnsembleRetriever(
                    retrievers=[bm25_retriever, vector_retriever],
                    weights=[0.5, 0.5]
                )
                
                # Récupérer les documents
                retrieved_docs = ensemble_retriever.get_relevant_documents(rag_query.query)
            else:
                # Utiliser uniquement la recherche vectorielle
                retrieved_docs = vectorstore.similarity_search(
                    rag_query.query,
                    k=rag_query.top_k,
                    filter=rag_query.filter
                )
            
            # Extraire le contexte et les sources
            contexts = []
            sources = []
            
            for i, doc in enumerate(retrieved_docs):
                # Ajouter le contenu au contexte
                contexts.append(doc.page_content)
                
                # Calculer un score pour chaque source (basé sur leur position relative)
                # Plus le document est haut dans la liste, plus son score est élevé
                score = 1.0 - (i / len(retrieved_docs)) if len(retrieved_docs) > 1 else 1.0
                
                # Ajouter les métadonnées du document
                metadata = doc.metadata.copy() if hasattr(doc, 'metadata') else {}
                
                # Ajouter le score aux métadonnées
                metadata["score"] = score
                
                # Ajouter aux sources
                sources.append({
                    "content": doc.page_content,
                    "metadata": metadata
                })
            
            # Calculer le temps d'exécution
            elapsed_time = time.time() - start_time
            
            # Créer et retourner la réponse RAG
            return RagResponse(
                query=rag_query.query,
                contexts=contexts,
                sources=sources,
                elapsed_time=elapsed_time
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'interrogation RAG: {str(e)}")
            raise

    def get_sources_str(self, sources: List[Dict]) -> str:
        """
        Formate les sources pour l'inclusion dans un prompt
        
        Args:
            sources: Liste des sources
            
        Returns:
            Chaîne formatée avec les sources
        """
        sources_str = ""
        for i, source in enumerate(sources):
            source_name = source.get("metadata", {}).get("filename", f"Source {i+1}")
            sources_str += f"Source {i+1} [{source_name}]: {source.get('content', '')}\n\n"
        
        return sources_str

    def format_rag_context(self, response: RagResponse) -> str:
        """
        Formate le contexte RAG pour l'inclusion dans un prompt
        
        Args:
            response: Réponse RAG
            
        Returns:
            Contexte formaté pour le prompt
        """
        context = "Voici des informations pertinentes pour répondre à la question:\n\n"
        
        for i, ctx in enumerate(response.contexts):
            context += f"---DOCUMENT {i+1}---\n{ctx}\n\n"
        
        return context

    def delete_collection(self, collection_name: str) -> bool:
        """
        Supprime une collection
        
        Args:
            collection_name: Nom de la collection à supprimer
            
        Returns:
            True si la suppression a réussi, False sinon
        """
        try:
            if collection_name in self.vectorstores:
                del self.vectorstores[collection_name]
            
            self.chroma_client.delete_collection(collection_name)
            logger.info(f"Collection {collection_name} supprimée avec succès")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de la collection {collection_name}: {str(e)}")
            return False

    def count_tokens(self, text: str) -> int:
        """
        Compte le nombre de tokens dans un texte
        
        Args:
            text: Texte à analyser
            
        Returns:
            Nombre de tokens
        """
        # Utilisation de tiktoken pour le comptage de tokens
        enc = tiktoken.get_encoding("cl100k_base")  # Encodage compatible avec la plupart des modèles
        return len(enc.encode(text))

# Création d'une instance globale du système RAG
rag_system = RAGSystem()

# Fonction pour obtenir l'instance du système RAG
def get_rag_system() -> RAGSystem:
    """
    Renvoie l'instance globale du système RAG
    """
    return rag_system

if __name__ == "__main__":
    # Test simple du système RAG
    print("Test du système RAG...")
    
    # Création d'une collection de test
    collection_name = "test_collection"
    
    # Récupération des collections existantes
    collections = rag_system.list_collections()
    print(f"Collections existantes: {[col.name for col in collections]}")
    
    # Affichage d'un message de confirmation
    print("Système RAG prêt à l'emploi") 