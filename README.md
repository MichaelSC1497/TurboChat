# TurboChat 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![GitHub stars](https://img.shields.io/github/stars/WKingston17/TurboChat.svg)](https://github.com/WKingston17/TurboChat/stargazers)

Une application de chat avancée avec IA intégrant RAG (Retrieval-Augmented Generation), recherche web, et système de quiz éducatif.

## 👤 Auteur

**Nazir YOUSSOUF YAYE**  

Linkedin: [@Nazir YOUSSOUF YAYE](https://www.linkedin.com/in/nazir-youssouf-yaye)
GitHub: [@WKingston17](https://github.com/WKingston17)

## 🌟 Fonctionnalités

### 💬 Chat Intelligent
- Support de multiples modèles d'IA (OpenAI, Gemini, Groq, OpenRouter)
- Modèles locaux avec llama.cpp
- Chat en streaming en temps réel
- Interface utilisateur moderne et responsive

### 📚 RAG (Retrieval-Augmented Generation)
- Indexation de documents (PDF, TXT, DOCX, etc.)
- Recherche sémantique dans vos documents
- Citations automatiques des sources
- Collections multiples pour organiser vos documents

### 🔍 TurboSearch (Recherche Web)
- Intégration avec SerpAPI pour recherche web en temps réel
- Enrichissement automatique des réponses avec des données récentes
- Citations des sources web

### 🎓 Système de Quiz
- Génération automatique de quiz à partir de vos documents
- Support de différents niveaux scolaires
- Suivi des performances et statistiques
- Interface intuitive pour étudiants et enseignants

### 📊 Fonctionnalités Avancées
- Gestion des conversations et historique
- Export des conversations
- Métriques de tokens et performance
- Interface multilingue (français/anglais)
- Thème sombre/clair

![image](https://github.com/user-attachments/assets/303fef91-e554-46d8-aaff-7c31f07fb6e3)
![image](https://github.com/user-attachments/assets/cd9c230b-3882-4b7c-b311-00daa8cac95e)
![image](https://github.com/user-attachments/assets/07e57e69-b7fe-453b-b62d-415ed6bc19a7)
![image](https://github.com/user-attachments/assets/63ebb3a2-72cb-48d8-b03e-a4f9fd2850f9)



## 🚀 Installation

### Prérequis
- Python 3.8+
- Node.js 16+
- npm ou yarn

### Installation Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Installation Frontend
```bash
cd frontend
npm install
npm run dev
```

### Lancement Rapide
```bash
chmod +x start_app.sh
./start_app.sh
```

## 🔧 Configuration

### APIs Supportées
- **OpenAI**: GPT-3.5, GPT-4, etc.
- **Google Gemini**: Gemini Pro, Gemini Flash
- **Groq**: Llama, Mixtral
- **OpenRouter**: Accès à de nombreux modèles

### Variables d'Environnement
Créez un fichier `.env` dans le dossier backend :
```bash
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
SERPAPI_KEY=your_serpapi_key
```

## 📁 Structure du Projet

```
TurboChat/
├── backend/           # API Python FastAPI
│   ├── app.py        # Application principale
│   ├── rag.py        # Système RAG
│   ├── turbosearch.py # Recherche web
│   ├── quiz_manager.py # Gestion des quiz
│   └── data/         # Données locales
├── frontend/         # Interface React
│   ├── src/
│   │   ├── pages/    # Pages principales
│   │   ├── components/ # Composants réutilisables
│   │   └── contexts/ # Contextes React
└── docs/            # Documentation
```

## 🛠️ Technologies

### Backend
- **FastAPI** - API REST rapide
- **LangChain** - Framework pour applications IA
- **ChromaDB** - Base de données vectorielle
- **llama.cpp** - Modèles locaux
- **SerpAPI** - Recherche web

### Frontend
- **React** - Interface utilisateur
- **Mantine** - Composants UI
- **Axios** - Client HTTP
- **React Router** - Navigation

## 📖 Documentation

La documentation complète est disponible dans le fichier `APP_DOCUMENTATION.md`.

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez `CONTRIBUTING.md` pour les guidelines.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- Guillaume VINEY, Jérémy BOURGUET, Ninot ASSANI, Osman SAID ALI
- L'équipe LangChain pour leur excellent framework
- La communauté llama.cpp pour les modèles locaux
- Tous les contributeurs open source

---

⭐ N'oubliez pas de mettre une étoile si ce projet vous aide ! 
