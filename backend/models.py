from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union

# Modèles pour la fonctionnalité Turbo Quizz

class QuizQuestion(BaseModel):
    """Modèle pour une question de quiz"""
    id: Optional[str] = None
    question: str
    options: List[str]
    correct_answer: int  # Index de la bonne réponse dans options
    explanation: str
    difficulty: str = "medium"  # "easy", "medium", "hard"
    tags: List[str] = []
    
class Quiz(BaseModel):
    """Modèle pour un quiz complet"""
    id: Optional[str] = None
    title: str
    description: str
    subject: str  # Matière (Mathématiques, Français, etc.)
    grade_level: str  # Niveau scolaire (6ème, 5ème, etc.)
    questions: List[QuizQuestion]
    created_at: Optional[str] = None
    rag_collection: Optional[str] = None  # Collection RAG associée
    duration_minutes: int = 15

class QuizAttempt(BaseModel):
    """Modèle pour une tentative de quiz par un élève"""
    id: Optional[str] = None
    quiz_id: str
    student_id: str
    student_name: str
    answers: List[int]  # Indices des réponses choisies
    score: float  # Pourcentage de bonnes réponses
    completed: bool = False
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    
class QuizResult(BaseModel):
    """Résultats détaillés d'un quiz avec analyse des forces et faiblesses"""
    attempt_id: str
    quiz_id: str
    student_id: str
    student_name: str
    score: float
    total_questions: int
    correct_answers: int
    incorrect_answers: int
    skipped_questions: int
    time_taken_minutes: float
    strengths: List[str]  # Tags des questions bien répondues
    weaknesses: List[str]  # Tags des questions mal répondues
    recommendations: List[Dict[str, Any]]  # Recommandations de ressources pour amélioration
    
class QuizGenerationRequest(BaseModel):
    """Demande de génération d'un quiz"""
    subject: str
    grade_level: str
    topic: str
    difficulty: str = "medium"
    question_count: int = 10
    rag_collection: Optional[str] = None
    
class StudentProgressReport(BaseModel):
    """Rapport de progression d'un élève"""
    student_id: str
    student_name: str
    quizzes_taken: int
    average_score: float
    subject_performance: Dict[str, float]  # Matière -> Score moyen
    topic_performance: Dict[str, float]  # Thème -> Score moyen
    improvement_areas: List[Dict[str, Any]]  # Domaines à améliorer
    recommended_quizzes: List[str]  # IDs des quiz recommandés 