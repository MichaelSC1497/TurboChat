import os
import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
import random

# Importation des modèles
from models import Quiz, QuizQuestion, QuizAttempt, QuizResult, QuizGenerationRequest, StudentProgressReport

# Définir les chemins de fichiers pour le stockage
QUIZ_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "quizzes")
ATTEMPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "quiz_attempts")
STUDENTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "students")

# Créer les répertoires s'ils n'existent pas
os.makedirs(QUIZ_DIR, exist_ok=True)
os.makedirs(ATTEMPTS_DIR, exist_ok=True)
os.makedirs(STUDENTS_DIR, exist_ok=True)

class QuizManager:
    """Gestionnaire pour créer, stocker et analyser les quiz"""
    
    def __init__(self, model_adapter=None):
        self.model_adapter = model_adapter
    
    def set_model_adapter(self, adapter):
        """Définir l'adaptateur de modèle pour la génération de quiz"""
        self.model_adapter = adapter
    
    async def generate_quiz(self, request: QuizGenerationRequest) -> Quiz:
        """Générer un quiz en utilisant l'IA"""
        if not self.model_adapter:
            raise Exception("Model adapter not set, cannot generate quiz")
        
        # Construire le prompt pour la génération de quiz
        prompt = self._build_quiz_generation_prompt(request)
        
        # Générer les questions avec l'IA
        messages = [
            {"role": "system", "content": "Tu es un générateur de quiz pédagogique expert."},
            {"role": "user", "content": prompt}
        ]
        
        # Si une collection RAG est spécifiée, récupérer son contenu
        rag_content = None
        if request.rag_collection:
            try:
                from rag import get_rag_system, RagQuery
                rag_system = get_rag_system()
                rag_query = RagQuery(
                    query=f"Information sur {request.topic} pour {request.grade_level} en {request.subject}",
                    collection_name=request.rag_collection,
                    top_k=5
                )
                rag_result = rag_system.query(rag_query)
                
                if rag_result.contexts:
                    rag_content = "\n\n".join([ctx for ctx in rag_result.contexts])
                    # Ajouter le contenu RAG au prompt
                    messages.append({
                        "role": "user", 
                        "content": f"Voici des informations supplémentaires pour t'aider à créer le quiz:\n\n{rag_content}"
                    })
            except Exception as e:
                print(f"Erreur lors de la récupération du contenu RAG: {e}")
        
        # Générer la réponse
        response = await self.model_adapter.generate_response(messages, {
            "max_tokens": 4000,
            "temperature": 0.7
        })
        
        # Extraire et formater les questions générées
        quiz_content = response["choices"][0]["message"]["content"]
        quiz = self._parse_generated_quiz(quiz_content, request)
        
        # Sauvegarder le quiz
        self.save_quiz(quiz)
        
        return quiz
    
    def _build_quiz_generation_prompt(self, request: QuizGenerationRequest) -> str:
        """Construire le prompt pour la génération de quiz"""
        return f"""
        Crée un quiz pédagogique sur le sujet "{request.topic}" pour des élèves de {request.grade_level} en {request.subject}.
        
        Instructions:
        - Crée exactement {request.question_count} questions à choix multiples de niveau {request.difficulty}
        - Chaque question doit avoir 4 options de réponse
        - Fournis l'explication pour chaque réponse correcte
        - Adapte le langage et la complexité au niveau scolaire {request.grade_level}
        - Les questions doivent favoriser la réflexion critique et pas seulement la mémorisation
        - Ajoute des tags pertinents pour chaque question (concepts clés abordés)
        
        Le format de sortie doit être strictement en JSON avec cette structure:
        {{
            "title": "Titre du quiz",
            "description": "Description du quiz",
            "questions": [
                {{
                    "question": "Texte de la question",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": 0,  // Index de la bonne réponse (0-3)
                    "explanation": "Explication de la réponse correcte",
                    "difficulty": "easy/medium/hard",
                    "tags": ["tag1", "tag2"]
                }},
                // Autres questions...
            ]
        }}
        
        Assure-toi que le JSON est valide et complet pour {request.question_count} questions.
        """
    
    def _parse_generated_quiz(self, content: str, request: QuizGenerationRequest) -> Quiz:
        """Parser le contenu généré par l'IA en objet Quiz"""
        # Extraire le JSON de la réponse (peut contenir du texte avant/après)
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            # Fallback si le parsing JSON échoue
            # Créer un quiz par défaut
            return Quiz(
                id=str(uuid.uuid4()),
                title=f"Quiz sur {request.topic}",
                description=f"Quiz généré sur {request.topic} pour {request.grade_level} en {request.subject}",
                subject=request.subject,
                grade_level=request.grade_level,
                questions=self._extract_questions_fallback(content),
                created_at=datetime.datetime.now().isoformat(),
                rag_collection=request.rag_collection,
                duration_minutes=len(self._extract_questions_fallback(content)) * 1.5  # 1.5 minute par question
            )
        
        try:
            json_str = content[json_start:json_end]
            quiz_data = json.loads(json_str)
            
            # Construire les objets QuizQuestion
            questions = []
            for q_data in quiz_data.get("questions", []):
                question = QuizQuestion(
                    id=str(uuid.uuid4()),
                    question=q_data.get("question", ""),
                    options=q_data.get("options", []),
                    correct_answer=q_data.get("correct_answer", 0),
                    explanation=q_data.get("explanation", ""),
                    difficulty=q_data.get("difficulty", request.difficulty),
                    tags=q_data.get("tags", [])
                )
                questions.append(question)
            
            # Créer l'objet Quiz
            quiz = Quiz(
                id=str(uuid.uuid4()),
                title=quiz_data.get("title", f"Quiz sur {request.topic}"),
                description=quiz_data.get("description", f"Quiz généré sur {request.topic}"),
                subject=request.subject,
                grade_level=request.grade_level,
                questions=questions,
                created_at=datetime.datetime.now().isoformat(),
                rag_collection=request.rag_collection,
                duration_minutes=len(questions) * 1.5  # 1.5 minute par question
            )
            
            return quiz
            
        except Exception as e:
            print(f"Erreur lors du parsing du quiz généré: {e}")
            return self._parse_generated_quiz_fallback(content, request)
    
    def _extract_questions_fallback(self, content: str) -> List[QuizQuestion]:
        """Méthode de secours pour extraire les questions en cas d'échec du parsing JSON"""
        questions = []
        
        # Rechercher les motifs de questions numérotées dans le texte
        lines = content.split('\n')
        current_question = None
        current_options = []
        current_answer = None
        current_explanation = None
        
        for line in lines:
            line = line.strip()
            
            # Nouvelle question détectée
            if line.startswith(('Q', 'Question')) and ':' in line:
                # Sauvegarder la question précédente si elle existe
                if current_question and current_options:
                    questions.append(QuizQuestion(
                        id=str(uuid.uuid4()),
                        question=current_question,
                        options=current_options,
                        correct_answer=current_answer if current_answer is not None else 0,
                        explanation=current_explanation or "Pas d'explication disponible",
                        difficulty="medium",
                        tags=[]
                    ))
                
                # Commencer une nouvelle question
                current_question = line.split(':', 1)[1].strip()
                current_options = []
                current_answer = None
                current_explanation = None
            
            # Option de réponse
            elif line.startswith(('A)', 'B)', 'C)', 'D)', 'a)', 'b)', 'c)', 'd)', 'A.', 'B.', 'C.', 'D.')):
                option_text = line.split(')', 1)[-1].strip() if ')' in line else line.split('.', 1)[-1].strip()
                current_options.append(option_text)
            
            # Réponse correcte
            elif "réponse" in line.lower() and ":" in line:
                answer_text = line.split(':', 1)[1].strip().upper()
                if answer_text in ['A', 'B', 'C', 'D']:
                    current_answer = ord(answer_text) - ord('A')
            
            # Explication
            elif "explication" in line.lower() and ":" in line:
                current_explanation = line.split(':', 1)[1].strip()
        
        # Ajouter la dernière question
        if current_question and current_options:
            questions.append(QuizQuestion(
                id=str(uuid.uuid4()),
                question=current_question,
                options=current_options,
                correct_answer=current_answer if current_answer is not None else 0,
                explanation=current_explanation or "Pas d'explication disponible",
                difficulty="medium",
                tags=[]
            ))
        
        return questions
    
    def _parse_generated_quiz_fallback(self, content: str, request: QuizGenerationRequest) -> Quiz:
        """Méthode de secours pour parser le quiz en cas d'échec du parsing JSON"""
        questions = self._extract_questions_fallback(content)
        
        return Quiz(
            id=str(uuid.uuid4()),
            title=f"Quiz sur {request.topic}",
            description=f"Quiz généré sur {request.topic} pour {request.grade_level} en {request.subject}",
            subject=request.subject,
            grade_level=request.grade_level,
            questions=questions,
            created_at=datetime.datetime.now().isoformat(),
            rag_collection=request.rag_collection,
            duration_minutes=len(questions) * 1.5  # 1.5 minute par question
        )
    
    def save_quiz(self, quiz: Quiz) -> None:
        """Sauvegarder un quiz dans le système de fichiers"""
        # Assurer qu'on a un ID
        if not quiz.id:
            quiz.id = str(uuid.uuid4())
        
        # Créer le chemin de fichier
        file_path = os.path.join(QUIZ_DIR, f"{quiz.id}.json")
        
        # Convertir en dictionnaire et sauvegarder
        quiz_dict = quiz.dict()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(quiz_dict, f, ensure_ascii=False, indent=2)
    
    def get_quiz(self, quiz_id: str) -> Optional[Quiz]:
        """Récupérer un quiz par son ID"""
        file_path = os.path.join(QUIZ_DIR, f"{quiz_id}.json")
        
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            quiz_dict = json.load(f)
        
        return Quiz(**quiz_dict)
    
    def list_quizzes(self, filters: Dict[str, Any] = None) -> List[Quiz]:
        """Lister les quiz disponibles avec filtres optionnels"""
        quizzes = []
        
        for filename in os.listdir(QUIZ_DIR):
            if filename.endswith('.json'):
                file_path = os.path.join(QUIZ_DIR, filename)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    quiz_dict = json.load(f)
                
                quiz = Quiz(**quiz_dict)
                
                # Appliquer les filtres si spécifiés
                if filters:
                    match = True
                    for key, value in filters.items():
                        if hasattr(quiz, key) and getattr(quiz, key) != value:
                            match = False
                            break
                    
                    if not match:
                        continue
                
                quizzes.append(quiz)
        
        return quizzes
    
    def delete_quiz(self, quiz_id: str) -> bool:
        """
        Supprimer un quiz par son ID
        
        Args:
            quiz_id: L'ID du quiz à supprimer
            
        Returns:
            bool: True si le quiz a été supprimé avec succès, False sinon
        """
        try:
            quiz_file = os.path.join(QUIZ_DIR, f"{quiz_id}.json")
            if os.path.exists(quiz_file):
                os.remove(quiz_file)
                print(f"Quiz {quiz_id} supprimé avec succès")
                return True
            else:
                print(f"Quiz {quiz_id} non trouvé")
                return False
        except Exception as e:
            print(f"Erreur lors de la suppression du quiz {quiz_id}: {e}")
            return False
    
    def save_attempt(self, attempt: QuizAttempt) -> None:
        """Sauvegarder une tentative de quiz"""
        # Assurer qu'on a un ID
        if not attempt.id:
            attempt.id = str(uuid.uuid4())
        
        # Créer le chemin de fichier
        file_path = os.path.join(ATTEMPTS_DIR, f"{attempt.id}.json")
        
        # Convertir en dictionnaire et sauvegarder
        attempt_dict = attempt.dict()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(attempt_dict, f, ensure_ascii=False, indent=2)
    
    def get_attempt(self, attempt_id: str) -> Optional[QuizAttempt]:
        """Récupérer une tentative de quiz par son ID"""
        file_path = os.path.join(ATTEMPTS_DIR, f"{attempt_id}.json")
        
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            attempt_dict = json.load(f)
        
        return QuizAttempt(**attempt_dict)
    
    def calculate_quiz_result(self, attempt_id: str) -> Optional[QuizResult]:
        """Calculer le résultat détaillé d'un quiz"""
        attempt = self.get_attempt(attempt_id)
        if not attempt:
            return None
        
        quiz = self.get_quiz(attempt.quiz_id)
        if not quiz:
            return None
        
        # Calculer les statistiques
        total_questions = len(quiz.questions)
        correct_answers = 0
        incorrect_answers = 0
        skipped_questions = 0
        
        strengths = []
        weaknesses = []
        
        for i, question in enumerate(quiz.questions):
            if i < len(attempt.answers):
                answer = attempt.answers[i]
                
                # Réponse correcte
                if answer == question.correct_answer:
                    correct_answers += 1
                    # Ajouter les tags aux forces
                    strengths.extend(question.tags)
                # Réponse incorrecte
                elif answer >= 0:  # Une réponse a été donnée
                    incorrect_answers += 1
                    # Ajouter les tags aux faiblesses
                    weaknesses.extend(question.tags)
                # Question sautée
                else:
                    skipped_questions += 1
                    weaknesses.extend(question.tags)
            else:
                skipped_questions += 1
        
        # Calculer le score
        score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        
        # Calculer le temps pris si les timestamps sont disponibles
        time_taken = 0
        if attempt.started_at and attempt.completed_at:
            start_time = datetime.datetime.fromisoformat(attempt.started_at)
            end_time = datetime.datetime.fromisoformat(attempt.completed_at)
            time_taken = (end_time - start_time).total_seconds() / 60  # en minutes
        
        # Identifier les points forts et faibles (les tags les plus fréquents)
        strength_counts = {}
        for tag in strengths:
            strength_counts[tag] = strength_counts.get(tag, 0) + 1
        
        weakness_counts = {}
        for tag in weaknesses:
            weakness_counts[tag] = weakness_counts.get(tag, 0) + 1
        
        # Filtrer les forces et faiblesses principales (les plus fréquentes)
        main_strengths = [tag for tag, count in sorted(strength_counts.items(), key=lambda x: x[1], reverse=True)]
        main_weaknesses = [tag for tag, count in sorted(weakness_counts.items(), key=lambda x: x[1], reverse=True)]
        
        # Générer des recommandations basées sur les faiblesses
        recommendations = self._generate_recommendations(main_weaknesses, quiz.subject, quiz.grade_level)
        
        # Créer le résultat
        result = QuizResult(
            attempt_id=attempt_id,
            quiz_id=attempt.quiz_id,
            student_id=attempt.student_id,
            student_name=attempt.student_name,
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            incorrect_answers=incorrect_answers,
            skipped_questions=skipped_questions,
            time_taken_minutes=time_taken,
            strengths=main_strengths[:5],  # Top 5 forces
            weaknesses=main_weaknesses[:5],  # Top 5 faiblesses
            recommendations=recommendations
        )
        
        # Mettre à jour le score de la tentative
        attempt.score = score
        attempt.completed = True
        if not attempt.completed_at:
            attempt.completed_at = datetime.datetime.now().isoformat()
        self.save_attempt(attempt)
        
        # Mettre à jour les statistiques de l'élève
        self._update_student_stats(attempt.student_id, attempt.student_name, result)
        
        return result
    
    def _generate_recommendations(self, weaknesses: List[str], subject: str, grade_level: str) -> List[Dict[str, Any]]:
        """Générer des recommandations d'apprentissage basées sur les faiblesses identifiées"""
        recommendations = []
        
        # Filtrer les quiz similaires qui pourraient aider
        similar_quizzes = self.list_quizzes({
            "subject": subject,
            "grade_level": grade_level
        })
        
        # Créer une recommandation pour chaque faiblesse principale
        for weakness in weaknesses[:3]:  # Top 3 faiblesses
            # Trouver des quiz qui couvrent cette faiblesse
            relevant_quizzes = []
            for quiz in similar_quizzes:
                for question in quiz.questions:
                    if weakness in question.tags:
                        relevant_quizzes.append(quiz)
                        break
            
            # Sélectionner jusqu'à 2 quiz pertinents
            recommended_quizzes = random.sample(relevant_quizzes, min(2, len(relevant_quizzes))) if relevant_quizzes else []
            
            recommendation = {
                "topic": weakness,
                "description": f"Revoir le concept de {weakness} en {subject}",
                "suggested_quizzes": [{"id": quiz.id, "title": quiz.title} for quiz in recommended_quizzes],
                "resources": [
                    {"type": "practice", "title": f"Exercices sur {weakness}", "description": f"Pratiquer {weakness} pour renforcer vos connaissances"}
                ]
            }
            
            recommendations.append(recommendation)
        
        return recommendations
    
    def _update_student_stats(self, student_id: str, student_name: str, result: QuizResult) -> None:
        """Mettre à jour les statistiques de l'élève avec les résultats du quiz"""
        student_file = os.path.join(STUDENTS_DIR, f"{student_id}.json")
        
        # Charger ou créer les statistiques de l'élève
        if os.path.exists(student_file):
            with open(student_file, 'r', encoding='utf-8') as f:
                student_data = json.load(f)
        else:
            student_data = {
                "student_id": student_id,
                "student_name": student_name,
                "quizzes_taken": 0,
                "total_score": 0,
                "subject_performance": {},
                "topic_performance": {},
                "quiz_history": [],
                "strengths": [],
                "weaknesses": []
            }
        
        # Mettre à jour les statistiques
        quiz = self.get_quiz(result.quiz_id)
        if quiz:
            # Incrémenter le nombre de quiz pris
            student_data["quizzes_taken"] += 1
            
            # Mettre à jour le score total
            student_data["total_score"] += result.score
            
            # Mise à jour des performances par matière
            if quiz.subject not in student_data["subject_performance"]:
                student_data["subject_performance"][quiz.subject] = {
                    "quizzes_taken": 0,
                    "total_score": 0
                }
            
            student_data["subject_performance"][quiz.subject]["quizzes_taken"] += 1
            student_data["subject_performance"][quiz.subject]["total_score"] += result.score
            
            # Ajouter à l'historique des quiz
            student_data["quiz_history"].append({
                "quiz_id": result.quiz_id,
                "attempt_id": result.attempt_id,
                "date": datetime.datetime.now().isoformat(),
                "score": result.score,
                "subject": quiz.subject,
                "grade_level": quiz.grade_level
            })
            
            # Mettre à jour les forces et faiblesses
            for strength in result.strengths:
                if strength not in student_data["strengths"]:
                    student_data["strengths"].append(strength)
            
            for weakness in result.weaknesses:
                if weakness not in student_data["weaknesses"]:
                    student_data["weaknesses"].append(weakness)
            
            # Sauvegarder les statistiques
            with open(student_file, 'w', encoding='utf-8') as f:
                json.dump(student_data, f, ensure_ascii=False, indent=2)
    
    def get_student_progress(self, student_id: str) -> Optional[StudentProgressReport]:
        """Récupérer le rapport de progression d'un élève"""
        student_file = os.path.join(STUDENTS_DIR, f"{student_id}.json")
        
        if not os.path.exists(student_file):
            return None
        
        with open(student_file, 'r', encoding='utf-8') as f:
            student_data = json.load(f)
        
        # Calculer le score moyen
        average_score = student_data["total_score"] / student_data["quizzes_taken"] if student_data["quizzes_taken"] > 0 else 0
        
        # Calculer les performances par matière
        subject_performance = {}
        for subject, perf in student_data["subject_performance"].items():
            avg_score = perf["total_score"] / perf["quizzes_taken"] if perf["quizzes_taken"] > 0 else 0
            subject_performance[subject] = avg_score
        
        # Identifier les domaines à améliorer
        improvement_areas = []
        for weakness in student_data.get("weaknesses", [])[:5]:  # Top 5 faiblesses
            improvement_areas.append({
                "topic": weakness,
                "description": f"Amélioration nécessaire en {weakness}"
            })
        
        # Recommander des quiz basés sur les faiblesses
        recommended_quizzes = []
        for weakness in student_data.get("weaknesses", [])[:3]:  # Top 3 faiblesses
            # Trouver des quiz qui couvrent cette faiblesse
            similar_quizzes = []
            for quiz in self.list_quizzes():
                for question in quiz.questions:
                    if weakness in question.tags:
                        similar_quizzes.append(quiz.id)
                        break
            
            # Ajouter les quiz recommandés (éviter les doublons)
            for quiz_id in similar_quizzes:
                if quiz_id not in recommended_quizzes and len(recommended_quizzes) < 5:
                    recommended_quizzes.append(quiz_id)
        
        # Créer le rapport de progression
        progress_report = StudentProgressReport(
            student_id=student_id,
            student_name=student_data["student_name"],
            quizzes_taken=student_data["quizzes_taken"],
            average_score=average_score,
            subject_performance=subject_performance,
            topic_performance={},  # À implémenter si nécessaire
            improvement_areas=improvement_areas,
            recommended_quizzes=recommended_quizzes
        )
        
        return progress_report 