# Documentation de l'Application TurboChat

## Vue d'ensemble

TurboChat est une application de chat IA complète qui permet aux utilisateurs d'interagir avec différents modèles de langage. L'application prend en charge plusieurs options:

- **Modèles locaux** : Llama, Mistral, et autres modèles GGUF
- **APIs externes** : OpenAI, Google Gemini, Groq, OpenRouter
- **Fonctionnalités avancées** : RAG (Retrieval-Augmented Generation), TurboQuizz, TurboSearch

## Structure de l'Application

L'application est divisée en deux parties principales:

### Frontend (React + Mantine UI)

- **Components** - Composants réutilisables
- **Contexts** - Gestion d'état global (ModelContext, ConversationContext)
- **Pages** - Pages principales de l'application

### Backend (FastAPI + llama.cpp)

- **API Endpoints** - Gestion des requêtes de chat, informations système, etc.
- **Model Adapters** - Connecteurs aux différentes APIs et modèles locaux

## Fonctionnalités Principales

### Chat

- Interface de chat réactive avec animation pour les messages
- Support du Markdown dans les réponses
- Possibilité de modifier/supprimer des messages
- Possibilité d'interrompre la génération du modèle
- Indicateur de frappe durant la génération
- Suggestions de questions pour les nouveaux utilisateurs
- Export de conversations

### Gestion des Modèles

- Chargement de modèles locaux au format GGUF
- Configuration d'APIs externes avec sauvegarde des clés API
- Paramètres ajustables (température, top_p, etc.)
- Statistiques d'utilisation des tokens pour les API
- Statistiques système (CPU, mémoire)

## Options de Modèles

### Modèles Locaux

Utilisation de modèles au format GGUF via llama.cpp avec options avancées:
- Taille du contexte (n_ctx)
- Taille du batch (n_batch)
- Nombre de couches sur GPU (n_gpu_layers)

### OpenAI API

Modèles disponibles:
- GPT-3.5 Turbo - Modèle équilibré entre coût et performance
- GPT-4 - Modèle avancé pour les tâches complexes
- GPT-4 Turbo - Version optimisée du GPT-4
- GPT-4o - Version omniscient de GPT-4

### Google Gemini API

Modèles disponibles:
- Gemini 1.5 Flash - Rapide et gratuit (limite de 1M tokens/min)
- Gemini 1.5 Pro - Version plus puissante
- Gemini Pro - Modèle polyvalent

### Groq API

Modèles disponibles avec inférence ultra-rapide:
- Llama 3.1 8B Instant - Ultra-rapide (100x GPT-4)
- Llama 3.3 70B Versatile - Performances excellentes
- Llama3 8B/70B - Modèles de base Llama3
- Gemma2 9B IT - Modèle Google efficace
- Mistral Saba 24B - Modèle Mistral avancé
- Mixtral 8X7B - Grande capacité contextuelle
- Llama-4 Scout/Maverick 17B - Modèles Meta état de l'art

### OpenRouter API (Modèles Gratuits)

OpenRouter donne accès à des dizaines de modèles de pointe gratuitement, incluant:

1. **Google Gemini 2.5 Pro Experimental** (id: google/gemini-2.5-pro-exp-03-25)
   - Modèle de pointe conçu pour les tâches avancées
   - 71,1B tokens, contexte de 1M tokens
   - Excellent pour la programmation, le raisonnement, et les mathématiques
   - Utilise des capacités de "réflexion" pour des réponses précises

2. **Google Gemini 2.0 Flash Experimental** (id: google/gemini-2.0-flash-exp:free)
   - 34,4B tokens
   - Temps de réponse ultra-rapide
   - Compréhension multimodale, codage et suivi d'instructions complexes
   - Bien adapté pour les agents IA

3. **Meta Llama 4 Scout** (id: meta-llama/llama-4-scout)
   - 2,27B tokens, contexte de 512K tokens
   - Modèle MoE (Mixture of Experts) activant 17B paramètres sur 109B
   - Support multimodal (texte et image) et multilingue (12 langues)
   - Excellent pour les interactions de type assistant

4. **Meta Llama 4 Maverick** (id: meta-llama/llama-4-maverick)
   - 10B tokens, contexte de 256K tokens
   - Modèle MoE avec 128 experts, 17B paramètres actifs (400B total)
   - Support multimodal avancé pour le raisonnement visuel
   - Optimisé pour les tâches linguistiques et visuelles complexes

5. **DeepSeek R1** (id: deepseek/deepseek-r1)
   - 50,7B tokens, contexte de 164K tokens
   - 671B paramètres (37B actifs par inférence)
   - Performance similaire à OpenAI o1, mais open-source
   - Licence MIT, permettant distillation et usage commercial

6. **Moonshot AI: Kimi VL A3B Thinking** (id: moonshotai/kimi-vl-a3b-thinking)
   - 75,3M tokens, contexte de 131K tokens
   - Modèle MoE léger activant seulement 2,8B paramètres
   - Excellente performance en raisonnement mathématique et visuel
   - Support d'entrées haute résolution via encodeur MoonViT

7. **Google Gemma 3 (12B & 27B)** (id: google/gemma-3-12b, google/gemma-3-27b)
   - Contexte jusqu'à 131K tokens (12B) ou 96K tokens (27B)
   - Support multimodal (entrée vision-langage)
   - Compréhension de plus de 140 langues
   - Capacités avancées de raisonnement et de chat

8. **Qwen3 Models (30B A3B & 235B A22B)** (id: qwen/qwen3-30b-a3b, qwen/qwen3-235b-a22b)
   - Contexte de 41K tokens
   - Architecture MoE avancée avec mode de réflexion
   - Support multilingue et raisonnement supérieur
   - Capacités de codage et d'écriture créative améliorées
   - **Note**: Ces modèles ne supportent pas le streaming en temps réel

## Configuration et Personnalisation

### Paramètres du Modèle

- **Température** - Contrôle la créativité des réponses (0-1)
- **Top-P** - Contrôle la distribution des probabilités (0-1)
- **Pénalisation de fréquence** - Évite la répétition de mots/phrases (0-2)
- **Pénalisation de présence** - Contrôle la diversité thématique (0-2)
- **Tone** - Ajuste le style des réponses (default, teacher, simple, detailed)

### Options avancées

- **Taille du contexte** - Nombre maximum de tokens par conversation
- **Nombre maximum de tokens** - Limite la longueur des réponses
- **Sauvegarde automatique** - Active la sauvegarde des conversations

## Guide d'Utilisation des Modèles

### Modèles OpenAI

- **GPT-3.5 Turbo** - Parfait pour les tâches quotidiennes, bon équilibre coût/performance
- **GPT-4/GPT-4o** - Pour les tâches complexes nécessitant un raisonnement avancé

### Modèles Gemini

- **Gemini 1.5 Flash** - Idéal pour des réponses rapides et une utilisation quotidienne
- **Gemini 1.5 Pro** - Pour les tâches plus exigeantes nécessitant une meilleure compréhension

### Modèles Groq

- **Llama 3.1 8B Instant** - Inférence ultra-rapide pour des réponses immédiates
- **Llama 3.3 70B** - Compromis idéal entre qualité et rapidité
- **Mixtral-8x7b-32768** - Excellent pour le traitement de longs contextes

### Modèles OpenRouter (Gratuits)

- **Gemini 2.5 Pro** - Pour des tâches complexes de raisonnement et de codage
- **Llama 4 Scout/Maverick** - Excellente option multimodale gratuite
- **DeepSeek R1** - Option open-source puissante pour des cas d'usage variés

## Fonctionnalités de Développement

L'application inclut plusieurs fonctionnalités pour les développeurs:

1. **Persistance des clés API** - Sauvegarde automatique des clés API dans le localStorage
2. **Possibilité d'interrompre la génération** - Arrêter les réponses trop longues
3. **ID de modèle personnalisé** - Support pour les nouveaux modèles OpenRouter
4. **Statistiques de tokens** - Suivi de l'utilisation pour les API payantes
5. **Streaming optimisé** - Réponses en temps réel avec contrôle de flux
6. **Compatibilité multi-modèles** - Gestion automatique des modèles avec ou sans capacité de streaming

## Déploiement et Configuration

### Prérequis

- Python 3.8+ pour le backend
- Node.js pour le frontend
- Modèles GGUF pour l'utilisation locale
- Clés API pour les services externes

### Variables d'Environnement

- `MODEL_PATH` - Chemin vers le modèle GGUF par défaut
- `MODEL_DIR` - Répertoire des modèles locaux
- Diverses configurations pour les limites de tokens et paramètres par défaut

## Performances et Optimisation

L'application est optimisée pour offrir une expérience fluide:

- Interface utilisateur réactive avec animations
- Streaming des réponses pour un feedback instantané
- Gestion efficace de la mémoire pour les modèles locaux
- Mise en cache des conversations pour une utilisation offline

## Contribution et Développement

Pour contribuer au développement:

1. Cloner le dépôt
2. Installer les dépendances via npm et pip
3. Lancer le backend avec uvicorn
4. Lancer le frontend avec vite

## License

Application sous license MIT.

## Architecture détaillée, mapping code-fonctionnalités

Cette section décrit **exhaustivement** chaque fonctionnalité visible de TurboChat, le *pourquoi*  (objectif fonctionnel) et le *comment*  (emplacement précis dans le code).

> Les citations de code suivent le format `startLine:endLine:filepath` pour pouvoir ouvrir le fichier directement dans un IDE ou via GitHub.

### 1. Cadre général Frontend

| Domaine | Fichier clé | Rôle | Ligne(s) importantes |
|---------|-------------|------|----------------------|
| Routing & layout | `frontend/src/App.jsx` | Shell principal (sidebar, header, routing) | `1-103` pour l'import `useModel` et le header dynamique ; `32-50` pour le menu dynamique |
| Chat UI | `frontend/src/pages/Chat.jsx` | Interface de discussion, streaming, fallback, message actions | `250-450` (définition du composant `Chat` et hooks) |
| Paramètres | `frontend/src/pages/Settings.jsx` | Configuration modèles locaux & API, détection, validation clés | `250-500` (validation stricte de la clé OpenRouter) |
| Contexte Modèle | `frontend/src/contexts/ModelContext.jsx` | Source unique de vérité pour modèle courant, statut, paramètres | `230-290` nouvelle fonction `getModelStatus` |
| Contexte Conversation | `frontend/src/contexts/ConversationContext.jsx` | Persistance des conversations & autosave | voir lignes `50-300` |

### 2. **Statut du modèle & badge unifié**

**But** : afficher un libellé/badge cohérent (Couleur + Label) dans toutes les pages.

*Implémentation*
1. Calcul central :
```240:286:frontend/src/contexts/ModelContext.jsx
// Fonction utilitaire pour le statut et le badge du modèle
const getModelStatus = () => {
  ...
  return { label, color };
};
```
2. Utilisation dans AppShell Header :
```20:40:frontend/src/App.jsx
const { getModelStatus } = useModel();
const modelStatus = getModelStatus();
...
<Text size="sm" c={modelStatus.color + '.6'}>{modelStatus.label}</Text>
```
3. Utilisation dans Chat (badge au-dessus du chat) :
```60:80:frontend/src/pages/Chat.jsx
const { getModelStatus } = useModel();
...
<Badge color={modelStatus.color}>{modelStatus.label}</Badge>
```
4. Utilisation dans Settings :
```120:150:frontend/src/pages/Settings.jsx
const modelStatus = getModelStatus();
<Badge color={modelStatus.color}>{modelStatus.label}</Badge>
```

### 3. **Validation stricte de la clé OpenRouter**

*Pourquoi* : Éviter qu'une valeur invalide (ex : une commande shell copié-collée) soit stockée → bloque 401 + mauvaises requêtes.

*Comment* :
```310:330:frontend/src/pages/Settings.jsx
if (apiType === 'openrouter' && !apiKeyInput.trim().startsWith('sk-or-')) {
  notifications.show({
    title: 'Erreur',
    message: 'La clé OpenRouter doit commencer par sk-or-.',
    color: 'red',
  });
  return; // stop save
}
```

### 4. **Contrôles Température & Ton (UI)**

Nouvelle barre compacte et étiquetée :
```140:190:frontend/src/pages/Chat.jsx
<Grid align="end" gutter="xs" mb="xs">
  ...
  <Grid.Col span={3}>
    <Text size="xs" fw={500}>Température</Text>
    <Select ... />
  </Grid.Col>
  <Grid.Col span={3}>
    <Text size="xs" fw={500}>Ton</Text>
    <Select ... />
  </Grid.Col>
  <Grid.Col span="content">
    <ActionIcon><IconSettings/></ActionIcon>
  </Grid.Col>
</Grid>
```
*Pourquoi* : améliore la lisibilité et met tous les contrôles sur une seule ligne (> tablette) ; passe vertical en mobile grâce au `Grid` Mantine.

### 5. **Streaming SSE + Fallback HTTP (Qwen)**

1. Démarrage du streaming :
```415:510:frontend/src/pages/Chat.jsx
const source = new EventSource(`/api/chat-stream?...`);
source.onmessage = (event)=>{ ... }
```
2. Détection Qwen + fallback :
```850:920:frontend/src/pages/Chat.jsx
if (isQwenModel) {
  await fallbackToDirectHttpForQwen(...);
}
```
3. Fallback HTTP direct :
```854:910:frontend/src/pages/Chat.jsx
const response = await fetch('/api/chat', { stream:false ... });
await handleDirectHttpResponse(response);
```
*Pourquoi* : les modèles Qwen gratuits ne supportent pas le SSE → passage automatique en mode non-streaming.

### 6. **Interruption de la génération**

```343:372:frontend/src/pages/Chat.jsx
const stopResponseGeneration = () => {
  if (streamController) {
    streamController.abort();
    ...
  }
};
```
- Bouton affiché pendant le streaming (`IconPlayerStop`) → coupe proprement l'`EventSource` + ajoute le texte déjà reçu.

### 7. **Sauvegarde des conversations**

- **Autosave** : géré dans `ConversationContext.jsx` (délai 2 s + debounced) L. `200-300`.
- **Export Markdown/JSON** : `exportConversation()` L. `420-480` du même fichier.

### 8. **Persistance & séparation des clés API**

```180:220:frontend/src/pages/Settings.jsx
localStorage.setItem('turbochat_api_keys', JSON.stringify(updatedKeys));
```
- Stocké par service → empêche la confusion de clés.

### 9. **Backend – Aperçu rapide**

| Endpoint | Fichier | Description |
|----------|---------|-------------|
| `GET /status` | `backend/app.py` | Renvoie `status`, `model_type`, `model_name` (utilisé par `ModelContext`) |
| `POST /set-api-key` | `backend/app.py` | Configure la clé et vérifie la connexion au service |
| `POST /chat` | `backend/app.py` | Mode non-streaming (ou préparation SSE) |
| `GET /chat-stream` | `backend/app.py` | SSE pour streaming |
| `GET /system-stats` | `backend/app.py` | CPU / RAM pour le dashboard |

> Les adaptateurs (dossier `backend/adapters/`) encapsulent les appels API (OpenRouterAdapter, OpenAIAdapter, etc.).
>
> Le **timeout étendu** pour Qwen est réglé dans `OpenRouterAdapter.send_request()`.

### 10. **Arborescence simplifiée du dépôt**

```
/backend
  app.py              # FastAPI main
  adapters/
    openrouter.py     # Gestion Qwen & co.
    openai.py         # OpenAI wrapper
  models/             # (GGUF locaux)
/frontend
  src/
    contexts/
      ModelContext.jsx
      ConversationContext.jsx
    pages/
      Chat.jsx
      Settings.jsx
      History.jsx
      TokenUsage.jsx
    App.jsx
  start_app.sh        # Lancement full-stack
```

---

## Comment contribuer / étendre

1. **Ajouter un nouveau modèle OpenRouter** : renseigner son ID dans *Paramètres → OpenRouter → Modèle personnalisé*.
2. **Ajouter un fournisseur API** :
   - Créer un adaptateur dans `backend/adapters/<provider>.py`.
   - Étendre l'enum `model_type` dans `app.py`.
   - Ajouter un onglet dans `Settings.jsx` (section APIs).
3. **Personnaliser les tons** : ajouter une entrée dans `tonePrompts` (L. `260` de `ModelContext.jsx`) puis ajouter l'option dans le `Select` de `Chat.jsx`.

---

> **TL;DR** : Cette documentation fournit toutes les informations (fonctionnalités, endpoints, références de code) nécessaires pour comprendre, maintenir et étendre TurboChat sans avoir à parcourir le code manuellement. Bonne exploration ! :rocket: 

## Flow de données détaillé

### Circuit complet d'une requête utilisateur

Cette section décrit le parcours complet d'une requête utilisateur, depuis l'interface jusqu'au modèle IA et retour.

1. **Input utilisateur → envoi** (`Chat.jsx:370-400`)
   ```js
   const handleSendMessage = async () => {
     // Préparer message utilisateur avec métriques
     const userMessage = { role: 'user', content: userContent, ... };
     
     // Ajouter à la conversation (UI immédiate)
     addMessage(userMessage);
     
     // Déclencher appel API (streaming ou direct)
     await generateStreamingResponse(userMessage);
   };
   ```

2. **Préparation contexte** (`Chat.jsx:1250-1276`)
   ```js
   const prepareConversationMessages = (userMessage) => {
     // Gérer le ton choisi (ex: "Explique comme à un enfant...")
     const tonePrompt = getTonePrompt();
     const messageWithTone = tonePrompt ? {...} : userMessage;
     
     // Filtrer messages supprimés et mapper au format API
     const messages = currentConversation.messages
       .filter(msg => !msg.deleted)
       .map(msg => ({ role: msg.role, content: msg.content }));
       
     // Ajouter nouveau message au contexte
     messages.push({ role: messageWithTone.role, ... });
     
     return messages;
   };
   ```

3. **Initialisation du streaming** (`Chat.jsx:415-510`)
   ```js
   // Créer un session ID unique
   const sessionId = Date.now().toString();
   
   // Préparer le streaming côté serveur
   const prepareResponse = await axios.post('/api/chat', {
     messages,
     max_tokens: parameters.max_tokens,
     temperature: parameters.temperature,
     ...
     stream: true,
     session_id: sessionId
   });
   
   // Initialiser EventSource pour streaming
   const source = new EventSource(`/api/chat-stream?...`);
   ```

4. **Backend: réception et redirection** (`backend/app.py:150-200`)
   ```python
   @app.post("/chat")
   async def chat(request: ChatRequest):
       # Créer session de streaming si demandé
       if request.stream:
           session_id = request.session_id or str(uuid.uuid4())
           streaming_sessions[session_id] = {
               "request": request,
               "response_queue": asyncio.Queue()
           }
           return {"session_id": session_id}
       # Sinon, générer réponse directe
       else:
           # Détecter modèle et adapter approprié
           adapter = get_adapter_for_model(request.model_type)
           response = await adapter.generate_response(request)
           return response
   ```

5. **Backend: streaming** (`backend/app.py:250-300`)
   ```python
   @app.get("/chat-stream")
   async def chat_stream(request: Request):
       # Récupérer la session par ID
       session_id = request.query_params.get("session_id")
       if session_id not in streaming_sessions:
           raise HTTPException(...)
           
       # Préparer SSE (Server-Sent Events)
       session = streaming_sessions[session_id]
       return EventSourceResponse(stream_generator(session_id, session))
   ```

6. **Adaptateur modèle (ex: OpenRouter)** (`backend/adapters/openrouter.py:50-150`)
   ```python
   async def generate_response(self, request):
       # Détection modèles Qwen (traitement spécial)
       is_qwen_model = "qwen" in request.model.lower()
       
       # Préparer la requête API
       headers = {
           "Authorization": f"Bearer {self.api_key}",
           "Content-Type": "application/json"
       }
       payload = {
           "model": request.model,
           "messages": request.messages,
           "temperature": request.temperature,
           "stream": request.stream and not is_qwen_model
       }
       
       # Envoi au service API
       response = await self.send_request(payload, headers, timeout=120 if is_qwen_model else 60)
       
       # Traitement réponse
       return self.process_response(response)
   ```

7. **Traitement réponse côté client** (`Chat.jsx:510-600`)
   ```js
   source.onmessage = async (event) => {
     // Traiter les chunks de texte
     if (data.type === 'chunk') {
       collectedContent += data.data;
       setPartialResponse(collectedContent);
     }
     // Message complet reçu
     else if (data.type === 'end') {
       addMessage({
         role: 'assistant',
         content: finalContent,
         metrics: { ... },
         timestamp: new Date()
       });
     }
   };
   ```

### Cycle de vie d'un message

1. **Création** : `addMessage()` dans ConversationContext
2. **Stockage** : Ajouté au tableau `messages` de la conversation actuelle
3. **Rendu** : Composant `Message` avec animations, options de menu
4. **Autosave** : Sauvegardé dans localStorage après debounce
5. **Manipulation** : Édition, suppression, régénération via contexte 
6. **Export** : Markdown ou JSON via `exportConversation()`

## Modèle objet détaillé

### `Conversation`

```typescript
interface Conversation {
  id: string;                     // UUID unique
  title: string | null;           // Titre défini par utilisateur ou auto-généré
  messages: Message[];            // Liste ordonnée des messages
  createdAt: string;              // ISO Date de création
  lastUpdated: string;            // ISO Date dernière mise à jour
  systemPrompt?: string;          // Prompt système optionnel
  model?: string;                 // Modèle utilisé (peut changer durant conversation)
  modelType?: string;             // Type de modèle (openai, gemini, etc.)
  parameters?: ModelParameters;   // Paramètres spécifiques à cette conversation
}
```

*Stockage* : Les conversations sont stockées dans le localStorage avec la clé `turbochat_conversations`, avec un maximum de 100 conversations sauvegardées (`MAX_SAVED_CONVERSATIONS`).

*Fichier* : `frontend/src/contexts/ConversationContext.jsx:35-70`

### `Message`

```typescript
interface Message {
  role: "user" | "assistant" | "system";  // Rôle du message
  content: string;                        // Contenu textuel du message
  timestamp: string;                      // ISO Date de création  
  metrics?: {                             // Métriques optionnelles
    tokens?: number;                      // Estimation tokens consommés
    time?: number;                        // Temps de génération (secondes)
    interrupted?: boolean;                // Si génération interrompue
  };
  deleted?: boolean;                      // Flag message supprimé
  edited?: boolean;                       // Flag message édité
  editTimestamp?: string;                 // ISO Date dernière édition
  regenerated?: boolean;                  // Flag réponse régénérée
  regenerateTimestamp?: string;           // ISO Date régénération
}
```

*Animation* : Les nouveaux messages sont ajoutés à `newMessages` dans l'état de `Chat` pour animations d'entrée.

*Fichier* : `frontend/src/pages/Chat.jsx:72-168` (Composant `Message`)

### `ModelParameters`

```typescript
interface ModelParameters {
  temperature: number;             // 0.0-1.0 Créativité
  max_tokens: number;              // Longueur max réponse
  top_p: number;                   // 0.0-1.0 Noyau probabilités
  frequency_penalty: number;       // 0.0-2.0 Pénalité répétition
  presence_penalty: number;        // 0.0-2.0 Diversité thématique
  stream: boolean;                 // Streaming activé
  tone: 'default' | 'teacher' | 'simple' | 'detailed';  // Style réponse
}
```

*Défauts* : définis dans `ModelContext.jsx:23-33` avec température 0.7, max_tokens 2000.

*UI* : contrôles dans `Chat.jsx:1200-1300` (barre supérieure) et `Settings.jsx:700-800` (paramètres par défaut).

## API Backend complète

Tous les endpoints sont implémentés dans `backend/app.py`. Documentation OpenAPI disponible sur `/docs`.

### Endpoints principaux

#### **GET `/status`**

- **Rôle** : Indique l'état actuel du backend et du modèle chargé
- **Retour** :
  ```json
  {
    "status": "Active" | "Loading" | "Error",
    "model_type": "local" | "openai" | "gemini" | "groq" | "openrouter",
    "model_name": "Nom du modèle actif",
    "model_path": "/path/to/model.gguf", // Si local
    "error": "Message d'erreur", // Si erreur
    "version": "1.1.0"
  }
  ```
- **Utilisé par** : `ModelContext.fetchModelInfo()`

#### **POST `/chat`**

- **Corps** :
  ```json
  {
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."}
    ],
    "max_tokens": 2000,
    "temperature": 0.7,
    "top_p": 0.9,
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "stream": true,       // Si streaming
    "session_id": "uuid"  // Si streaming
  }
  ```
- **Retour non-streaming** :
  ```json
  {
    "choices": [{
      "message": {"role": "assistant", "content": "..."}
    }],
    "usage": {
      "prompt_tokens": 123,
      "completion_tokens": 456
    }
  }
  ```
- **Retour streaming** :
  ```json
  {
    "session_id": "uuid"  // ID pour connexion EventSource
  }
  ```

#### **GET `/chat-stream?session_id=uuid`**

- **Rôle** : Endpoint SSE pour streaming de réponse
- **Paramètres** : `session_id` (obligatoire)
- **Format de sortie SSE** : Série d'événements au format:
  ```
  data: {"type": "chunk", "data": "partie de texte"}
  
  data: {"type": "end", "data": "texte complet", "stats": {...}}
  ```

#### **POST `/set-api-key`**

- **Corps** :
  ```json
  {
    "model_type": "openai" | "gemini" | "groq" | "openrouter",
    "api_key": "sk-...",
    "model_name": "gpt-4" 
  }
  ```
- **Retour** :
  ```json
  {
    "status": "API key set successfully" | "Error setting API key",
    "error": "Message d'erreur"  // Si erreur
  }
  ```

#### **GET `/models`**

- **Rôle** : Liste tous les modèles GGUF disponibles
- **Retour** :
  ```json
  {
    "models": [
      {
        "filename": "Llama-3-8B-Instruct.Q4_K_M.gguf",
        "size_gb": 4.23,
        "is_active": true
      },
      ...
    ]
  }
  ```

#### **GET `/api-models`**

- **Rôle** : Liste modèles disponibles pour chaque service API
- **Retour** :
  ```json
  {
    "models": {
      "openai": [{"id": "gpt-4", "name": "GPT-4", ...}],
      "gemini": [...],
      "groq": [...],
      "openrouter": [...]
    }
  }
  ```

#### **GET `/token-usage`**

- **Rôle** : Statistiques d'utilisation pour APIs payantes
- **Retour** :
  ```json
  {
    "current_period": {
      "total_tokens": 12345,
      "input_tokens": 5000,
      "output_tokens": 7345
    },
    "limits": {
      "total_tokens": 1000000,
      "reset_date": "2024-06-01T00:00:00Z"
    },
    "cost": {
      "usd": 0.34
    }
  }
  ```

#### **GET `/system-stats`**

- **Rôle** : Infos système pour dashboard
- **Retour** :
  ```json
  {
    "cpu_percent": 23.5,
    "memory": {
      "total": 16000000000,
      "available": 8000000000,
      "percent": 50.0
    },
    "platform": "Darwin-22.4.0"
  }
  ```

### Adaptateurs de Modèle

Le backend utilise une architecture adaptateur pour abstraire les différentes APIs:

```python
class ModelAdapter:
    """Interface commune pour tous les adaptateurs."""
    
    async def generate_response(self, request):
        """Génère une réponse basée sur la requête."""
        pass
        
    async def stream_response(self, request, response_queue):
        """Diffuse une réponse en streaming."""
        pass
```

Adaptateurs implémentés:
- `LocalAdapter` : modèles GGUF via llama.cpp
- `OpenAIAdapter` : API OpenAI
- `GeminiAdapter` : API Google Gemini
- `GroqAdapter` : API Groq
- `OpenRouterAdapter` : API OpenRouter

## Guide avancé des fonctionnalités techniques

### 1. Interruption de génération

`frontend/src/pages/Chat.jsx:343-372`

```js
const stopResponseGeneration = () => {
  if (streamController) {
    streamController.abort();  // AbortController standard
    setStreamController(null);
    
    // Ajouter partiellement ce qui a été généré
    if (partialResponse) {
      addMessage({ 
        role: 'assistant', 
        content: partialResponse,
        metrics: {
          interrupted: true  // Flag spécial
        },
        timestamp: new Date()
      });
    }
    
    setIsLoading(false);
    notifications.show({
      title: 'Génération interrompue',
      message: 'La génération a été interrompue',
      color: 'blue',
    });
  }
};
```

**Notes techniques**:
- Utilise `AbortController` standard pour couper proprement les requêtes fetch
- Préserve le texte déjà généré comme message définitif
- Flag `interrupted: true` dans les métriques (utilisable pour UI)
- **Interface** : Bouton rouge `IconPlayerStop` affiché uniquement pendant le streaming

### 2. Auto-détection du modèle en streaming

`frontend/src/pages/Chat.jsx:500-550`

```js
// Pour les modèles Qwen, nous recevons tout le contenu en une seule fois
const isQwenModel = currentModel && 
                  modelType === 'openrouter' && 
                  currentModel.toLowerCase().includes('qwen');

if (isQwenModel) {
  console.log("Traitement d'une réponse Qwen complète");
  // Remplacer complètement (pas d'accumulation)
  collectedContent = data.data;
} else {
  // Pour les autres modèles, accumulation normale
  collectedContent += data.data;
}
```

**Comportement adaptatif**:
- Détecte automatiquement les modèles Qwen par leur ID
- Utilise un mode d'accumulation différent selon le modèle
- Timeout étendu (120s vs 60s) pour ces modèles

### 3. Système de tons personnalisés

Le système permet de préfixer les messages utilisateur avec des instructions pour orienter le style de réponse:

`frontend/src/contexts/ModelContext.jsx:270-280`

```js
// Tones prédéfinis pour les prompts
const tonePrompts = {
  default: "",  // Aucun préfixe
  teacher: "Réponds comme un professeur pédagogue: ",
  simple: "Explique de façon très simple, comme à un enfant de 10 ans: ",
  detailed: "Fournis une explication détaillée et approfondie: "
};

// Obtenir le prompt à ajouter
const getTonePrompt = () => {
  return tonePrompts[parameters.tone] || "";
};
```

**Application du ton**:
`frontend/src/pages/Chat.jsx:1260-1270`

```js
// Appliquer le ton au message
const tonePrompt = getTonePrompt();
const messageWithTone = tonePrompt ? 
  { ...userMessage, content: tonePrompt + userMessage.content } : 
  userMessage;
```

**Extension**: Pour ajouter de nouveaux tons, il suffit de:
1. Ajouter une entrée dans `tonePrompts`
2. Ajouter l'option dans le sélecteur de ton de `Chat.jsx`

### 4. Architecture complète du localStorage

La persistance utilise plusieurs clés pour isoler les données:

| Clé localStorage | Contenu | Format | Utilisé par |
|------------------|---------|--------|-------------|
| `turbochat_conversations` | Toutes les conversations | `Array<Conversation>` | `ConversationContext` |
| `turbochat_current_conversation_id` | ID dernière conversation active | `string` | `ConversationContext` |
| `turbochat_api_keys` | Clés API par service | `{openai: "sk-...", openrouter: "sk-or-..."}` | `Settings.jsx` |
| `turbochat_parameters` | Paramètres par défaut | `ModelParameters` | `ModelContext` |

**Séparation des clés API**:

```js
// Sauvegarder la clé API dans le localStorage uniquement pour ce service
const updatedKeys = { ...savedApiKeys, [apiType]: apiKeyInput };
localStorage.setItem('turbochat_api_keys', JSON.stringify(updatedKeys));
```

**Avantage**: empêche la confusion entre services (ex: une clé OpenAI utilisée pour OpenRouter).

## Dépannage & Bugs connus

### Problèmes courants

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| "Stream connection error" | Timeout événement SSE, bloquage CORS, modèle sans streaming | Vérifier logs, utiliser des modèles compatibles (non-Qwen) |
| "Invalid or expired session" | Session ID perdu entre requêtes | S'assure que les sessions sont proprement nettoyées (`Cleaning up session: <id>`) |
| "Modèle non chargé" persistant | La fonction `getModelStatus()` renvoie des valeurs incohérentes | Redémarrer l'application, vérifier contexte |
| Clé API OpenRouter refusée | Format invalide (ne commence pas par sk-or-) | Utiliser une clé fraîche depuis openrouter.ai |
| "No auth credentials found" | Clé API non reconnue par le service externe | Vérifier le format et la validité de la clé, service API actif |

### Surveillance et diagnostics

**Logs serveur importants**:
- `Creating new streaming session with ID: <uuid>` - Début d'une session
- `Available sessions: [...]` - Liste des sessions actives
- `Cleaning up session: <id>` - Nettoyage session
- `Response status code: <code>` - Code HTTP de l'API externe
- `Erreur lors de la génération...` - Échec avec raison

**Logging client**:
```js
console.log(`Generated session ID: ${sessionId}`);
// ...
console.error('Error in generateStreamingResponse:', error);
```

## Diagrammes techniques

### Architecture générale

```
+-----------------+       HTTP/SSE       +----------------+       HTTP       +---------------+
|                 |  ----------------->  |                |  ------------->  |               |
|  React Frontend |  <-----------------  |  FastAPI       |  <-------------  |  Modèles IA   |
|  (Mantine UI)   |                      |  Backend       |                  |               |
+-----------------+                      +----------------+                  +---------------+
     |                                        |                                    |
     |                                        |                                    |
+----v----+                             +-----v-----+                        +-----v------+
|         |                             |           |                        |            |
| Browser |                             | Adapters  |                        | OpenRouter |
| Storage |                             |           |                        | OpenAI     |
+---------+                             +-----------+                        | Gemini     |
                                                                            | Groq       |
                                                                            | Local GGUF  |
                                                                            +------------+
```

### Flux de conversation

```
+--------+    +--------+    +--------+    +--------+
|        |    |        |    |        |    |        |
| Entrée | -> | Traite | -> | Envoi  | -> | Stream |
| User   |    | Ton    |    | API    |    | SSE    |
|        |    |        |    |        |    |        |
+--------+    +--------+    +--------+    +--------+
                                              |
+--------+    +--------+    +--------+    +---v----+
|        |    |        |    |        |    |        |
| Sauve  | <- | Ajoute | <- | Parse  | <- | Reçoit |
| Auto   |    | Msg    |    | JSON   |    | Chunks |
|        |    |        |    |        |    |        |
+--------+    +--------+    +--------+    +--------+
```

### Architecture des Contexts

```
+-------------------+       +-------------------+
|                   |       |                   |
| ConversationContext    | |   ModelContext    |
|                   |       |                   |
+-------------------+       +-------------------+
         △                            △
         │                            │
         │                            │
         │                            │
         │                            │
+--------v----------------------------v-----------+
|                                                 |
|                     App                         |
|                                                 |
+-------------------------------------------------+
         △                            △
         │                            │
         │                            │
         │                            │
+--------v------------+    +----------v---------+
|                     |    |                    |
| Settings, History   |    |   Chat             |
|                     |    |                    |
+---------------------+    +--------------------+
```

---

En conclusion, cette documentation exhaustive fournit toutes les informations nécessaires pour comprendre, déboguer, maintenir et étendre TurboChat. Les détails techniques sont présentés de manière hiérarchique, permettant aux développeurs et utilisateurs de tous niveaux de trouver les informations dont ils ont besoin.

## Système RAG (Retrieval-Augmented Generation)

TurboChat intègre désormais un système complet de RAG (Retrieval-Augmented Generation) qui permet d'enrichir les réponses du modèle avec des informations provenant de documents personnalisés. Cette fonctionnalité offre une expérience d'intelligence artificielle beaucoup plus précise et contextualisée.

### Principes du RAG

Le RAG est une technique hybride combinant :
1. **Retrieval** (Récupération) : Recherche d'informations pertinentes dans des documents indexés
2. **Augmented Generation** (Génération Augmentée) : Utilisation de ces informations pour enrichir les réponses du modèle

Ce système permet de :
- Obtenir des réponses plus précises et factuelles
- Adapter le modèle à des domaines spécifiques sans fine-tuning
- Réduire les hallucinations et inexactitudes
- Fournir des sources traçables pour les informations

### Architecture technique

#### 1. Backend (Python/FastAPI)

Le système RAG de TurboChat s'appuie sur:

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Découpage de texte | `RecursiveCharacterTextSplitter` de LangChain | Divise les documents en chunks de taille optimale (1000 caractères avec 200 de chevauchement) |
| Embeddings | `HuggingFaceEmbeddings` avec le modèle "sentence-transformers/all-MiniLM-L6-v2" | Transforme les chunks de texte en vecteurs sémantiques |
| Base vectorielle | `Chroma` de LangChain | Stocke et indexe les vecteurs pour la recherche par similarité |
| Recherche hybride | Combinaison de `BM25Retriever` et recherche vectorielle avec `EnsembleRetriever` | Équilibre recherche par mots-clés (30%) et similarité sémantique (70%) |

Le code source principal se trouve dans :
- `backend/rag.py` : Implémentation du système RAG
- `backend/app.py` : Endpoints API pour le RAG

#### 2. Frontend (React/Mantine)

L'interface utilisateur pour le RAG comprend:

- **Page RagManager** (`frontend/src/pages/RagManager.jsx`) : Gestion des collections et documents
- **Intégration dans Chat** (`frontend/src/pages/Chat.jsx`) : Bouton d'activation du RAG dans l'interface de chat

### Formats de documents supportés

Le système RAG de TurboChat prend en charge un large éventail de formats de documents:

| Format | Extension | Chargeur |
|--------|-----------|----------|
| PDF | .pdf | PyPDFLoader |
| Texte brut | .txt | TextLoader |
| Markdown | .md, .markdown | UnstructuredMarkdownLoader |
| HTML | .html, .htm | UnstructuredHTMLLoader |
| CSV | .csv | CSVLoader |
| Word | .doc, .docx | Docx2txtLoader |

### Utilisation du RAG

#### 1. Gestion des collections

Les documents sont organisés en collections. Une collection est un ensemble de documents sur un sujet connexe.

Pour créer et gérer des collections:
1. Accédez à l'onglet "Base de Connaissances" dans le menu
2. Créez une nouvelle collection en lui donnant un nom
3. Sélectionnez la collection pour y ajouter des documents

#### 2. Indexation de documents

Pour ajouter des documents à une collection:
1. Sélectionnez une collection
2. Dans l'onglet "Ajouter des documents", téléchargez un fichier
3. Le système découpe automatiquement le document en chunks et les indexe

#### 3. Interrogation directe

Pour tester une collection:
1. Dans l'onglet "Interroger", sélectionnez une collection
2. Entrez une requête et ajustez les paramètres (nombre de résultats, recherche hybride)
3. Les résultats affichent les passages pertinents avec leurs métadonnées

#### 4. Utilisation dans le chat

Pour utiliser le RAG dans une conversation:
1. Dans l'interface de chat, cliquez sur le bouton "RAG"
2. Activez la recherche documentaire et sélectionnez une collection
3. Vos questions seront désormais enrichies avec les informations de la collection

### Flow de données complet

1. **Indexation**:
   - Le document est chargé via le chargeur approprié
   - Le texte est découpé en chunks avec chevauchement
   - Chaque chunk est transformé en vecteur via le modèle d'embedding
   - Les vecteurs sont stockés dans ChromaDB avec leurs métadonnées

2. **Requête**:
   - La question utilisateur est transformée en vecteur
   - Une recherche hybride combine BM25 (mots-clés) et similarité vectorielle
   - Les chunks les plus pertinents sont récupérés
   - Un prompt est construit avec la question et les chunks pertinents
   - Le modèle LLM génère une réponse basée sur ce prompt enrichi

### Performance et optimisations

Le système RAG de TurboChat inclut plusieurs optimisations:

- **Recherche hybride** : Combine les avantages de la recherche par mots-clés (précision) et vectorielle (compréhension sémantique)
- **Chunks optimisés** : Taille et chevauchement calibrés pour maintenir le contexte tout en permettant une recherche précise
- **Modèle d'embedding léger** : all-MiniLM-L6-v2 offre un bon équilibre entre performance et qualité
- **Persistance des vecteurs** : Les index sont stockés sur disque pour réutilisation

### Limites actuelles

- Pas de support multimodal (images, audio)
- Pas de RAG récursif ou multi-étapes
- Pas de reranking avancé des résultats

### Roadmap future

- Support de la recherche par facettes (filtrage par métadonnées)
- Amélioration du reranking avec des modèles spécialisés
- Implémentation de RAG récursif pour les questions complexes
- Support multimodal (extraction de texte des images)

### Exemples d'application

Le RAG est particulièrement utile pour:

1. **Éducation** : Créer des collections de cours et supports pédagogiques
2. **Recherche** : Indexer des articles scientifiques pour obtenir des réponses précises
3. **Documentation technique** : Créer un assistant capable de répondre à des questions sur une documentation spécifique
4. **Support client** : Base de connaissances pour répondre aux questions fréquentes