import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { notifications } from '@mantine/notifications';

const ModelContext = createContext();

export const useModel = () => useContext(ModelContext);

export const ModelProvider = ({ children }) => {
  const [models, setModels] = useState([]);
  const [apiModels, setApiModels] = useState({ openai: [], gemini: [], groq: [] });
  const [currentModel, setCurrentModel] = useState(null);
  const [modelDetails, setModelDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // État pour suivre le type de modèle actuel et les informations associées
  const [modelType, setModelType] = useState('local'); // 'local', 'openai', 'gemini', 'groq'
  const [apiKey, setApiKey] = useState('');
  const [apiModelSelected, setApiModelSelected] = useState('');
  const [tokenUsage, setTokenUsage] = useState(null);

  // Paramètres par défaut pour la génération
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
    tone: 'default' // Options: 'default', 'teacher', 'simple', 'detailed'
  });

  // Dans l'initialisation du modelInfo, ajouter la clé serpapi_key
  const [modelInfo, setModelInfo] = useState({
    status: 'unknown',
    isLoading: true,
    isConnected: false,
    modelType: null,
    modelName: null,
    apiKey: null,
    serpapi_key: null,  // Nouvelle propriété pour la clé SerpAPI
    isLocal: false,
    localModels: []
  });

  // Fonction memoizée pour récupérer les informations du modèle
  const fetchModelInfo = useCallback(async () => {
    setLoading(true);
    try {
      // Récupérer le statut du modèle actuel
      const statusResponse = await axios.get('/api/status');
      const newModelType = statusResponse.data.model_type || 'local';
      setModelType(newModelType);
      
      if (statusResponse.data.status === "Active") {
        setModelDetails(statusResponse.data);
        
        if (statusResponse.data.model_type === 'local') {
          const modelPath = statusResponse.data.model_path;
          const modelName = statusResponse.data.model_name || modelPath.split('/').pop();
          setCurrentModel(modelName);
        } else {
          // Pour les modèles API
          setCurrentModel(statusResponse.data.model_name);
          setApiModelSelected(statusResponse.data.model_name);
          
          // Récupérer les statistiques d'utilisation si c'est un modèle API
          fetchTokenUsage();
        }
      }

      // Récupérer la liste des modèles disponibles
      const modelsResponse = await axios.get('/api/models');
      if (modelsResponse.data.models && modelsResponse.data.models.length > 0) {
        setModels(modelsResponse.data.models);
        setError(null);
      } else {
        setError('Aucun modèle local trouvé. Veuillez ajouter des modèles dans le répertoire "models" ou configurer une API.');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des informations du modèle:', err);
      setError('Erreur de connexion au serveur. Veuillez vérifier que le backend est en cours d\'exécution.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour récupérer les stats d'utilisation des tokens
  const fetchTokenUsage = useCallback(async () => {
    if (modelType === 'local') return;
    
    try {
      const response = await axios.get('/api/token-usage');
      if (response.data && !response.data.error) {
        setTokenUsage(response.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques d\'utilisation:', err);
    }
  }, [modelType]);
  
  // Fonction pour récupérer la liste des modèles API disponibles
  const fetchApiModels = useCallback(async () => {
    try {
      const response = await axios.get('/api/api-models');
      if (response.data && response.data.models) {
        setApiModels(response.data.models);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des modèles API:', err);
    }
  }, []);

  // Charger les infos du modèle au démarrage et les modèles API
  useEffect(() => {
    fetchModelInfo();
    fetchApiModels();
    
    // Configurer un rafraîchissement périodique pour les API
    const refreshInterval = setInterval(() => {
      if (modelType !== 'local') {
        fetchTokenUsage();
      }
    }, 60000); // Rafraîchir toutes les minutes
    
    return () => clearInterval(refreshInterval);
  }, [fetchModelInfo, fetchApiModels, fetchTokenUsage, modelType]);

  // Fonction pour changer de modèle local
  const changeModel = async (modelFile) => {
    if (!modelFile) return false;

    try {
      setLoading(true);
      
      // Passer au modèle local
      const response = await axios.post(`/api/switch-to-local?model_file=${modelFile}`);
      
      if (response.data.status === 'Switched to local model successfully') {
        setCurrentModel(modelFile);
        setModelDetails(response.data);
        setModelType('local');
        
        notifications.show({
          title: 'Modèle chargé',
          message: `Le modèle a été changé pour ${modelFile}`,
          color: 'green',
        });
        
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur lors du changement de modèle:', err);
      
      notifications.show({
        title: 'Erreur',
        message: `Impossible de changer le modèle: ${err.message}`,
        color: 'red',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour tester une clé API et récupérer les modèles disponibles
  const testApiKey = async (apiType, key) => {
    if (!key || !apiType) return { success: false, message: "Paramètres invalides" };
    
    try {
      setLoading(true);
      
      // Modèle par défaut pour le test
      let defaultModel;
      switch(apiType) {
        case 'gemini':
          defaultModel = 'gemini-1.5-flash';
          break;
        case 'groq':
          defaultModel = 'llama-3.1-8b-instant';
          break;
        default:
          defaultModel = 'gpt-3.5-turbo';
      }
      
      const response = await axios.post('/api/set-api-key', {
        model_type: apiType,
        api_key: key,
        model_name: defaultModel
      });
      
      if (response.data.status === 'API key set successfully') {
        // Mettre à jour les infos et récupérer les modèles
        await fetchModelInfo();
        await fetchApiModels();
        
        return { 
          success: true, 
          message: "Clé API validée avec succès",
          models: apiModels[apiType] || []
        };
      }
      
      return { success: false, message: "Erreur lors de la validation de la clé API" };
    } catch (err) {
      console.error('Erreur lors du test de la clé API:', err);
      return { 
        success: false, 
        message: `Erreur: ${err.message}` 
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour configurer une API externe
  const setExternalApi = async (apiType, key, modelName) => {
    try {
      setLoading(true);
      console.log(`Configuration de l'API ${apiType} avec le modèle ${modelName}`);
      
      // Vérifier que nous n'utilisons pas la clé API d'un autre service
      // OpenRouter a un format sk-or-..., Gemini avec AIza..., Groq avec gsk_...
      const keyFormats = {
        openrouter: key => key.startsWith('sk-or-'),
        gemini: key => key.startsWith('AIza'),
        groq: key => key.startsWith('gsk_'),
        openai: key => key.startsWith('sk-') && !key.startsWith('sk-or-')
      };
      
      // Vérifier si la clé semble correspondre au type d'API sélectionné
      if (keyFormats[apiType] && !keyFormats[apiType](key)) {
        console.warn(`La clé API ne semble pas être au format attendu pour ${apiType}`);
        // On continue quand même, c'est juste un avertissement
      }
      
      const response = await axios.post('/api/set-api-key', {
        model_type: apiType,
        api_key: key,
        model_name: modelName
      });
      
      if (response.data.status === 'API key set successfully') {
        // Sauvegarde des valeurs localement
        localStorage.setItem(`${apiType}_api_key`, key);
        localStorage.setItem(`${apiType}_model_name`, modelName);
        
        // Mettre à jour l'état
        setApiKey(key);
        // Important: toujours mettre à jour le type de modèle actif 
        setModelType(apiType);
        setCurrentModel(modelName);
        setApiModelSelected(modelName);
        
        // Mise à jour de modelInfo
        setModelInfo(prev => ({
          ...prev,
          modelType: apiType,
          modelName: modelName,
          apiKey: key
        }));
        
        // Informer l'utilisateur que la configuration est réussie
        notifications.show({
          title: 'API configurée',
          message: `L'API ${apiType} a été configurée et activée avec succès`,
          color: 'green',
        });
        
        // Mettre à jour les modèles disponibles pour ce type d'API
        try {
          const apiModelsResponse = await axios.get('/api/api-models');
          if (apiModelsResponse.data && apiModelsResponse.data.models) {
            setApiModels(apiModelsResponse.data.models);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des modèles API:", error);
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Erreur lors de la configuration de l\'API:', err);
      
      notifications.show({
        title: 'Erreur',
        message: `Impossible de configurer l'API: ${err.message}`,
        color: 'red',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour les paramètres du modèle
  const updateParameters = (newParams) => {
    setParameters(prev => ({ ...prev, ...newParams }));
  };

  // Tones prédéfinis pour les prompts
  const tonePrompts = {
    default: "",
    teacher: "Réponds comme un professeur pédagogue: ",
    simple: "Explique de façon très simple, comme à un enfant de 10 ans: ",
    detailed: "Fournis une explication détaillée et approfondie: "
  };

  // Obtenir le prompt de ton à ajouter au message utilisateur
  const getTonePrompt = () => {
    return tonePrompts[parameters.tone] || "";
  };

  // Fonction utilitaire pour le statut et le badge du modèle
  const getModelStatus = () => {
    if (error) {
      return { label: 'Erreur', color: 'red' };
    }
    if (modelType !== 'local' && currentModel) {
      let label = '';
      let color = 'green';
      switch (modelType) {
        case 'openrouter':
          label = `API Externe : OpenRouter (${currentModel.split('/').slice(-1)[0].replace(':free', '')})`;
          color = 'orange';
          break;
        case 'openai':
          label = `API Externe : OpenAI (${currentModel})`;
          color = 'green';
          break;
        case 'gemini':
          label = `API Externe : Gemini (${currentModel})`;
          color = 'violet';
          break;
        case 'groq':
          label = `API Externe : Groq (${currentModel})`;
          color = 'teal';
          break;
        default:
          label = `API Externe (${currentModel})`;
          color = 'blue';
      }
      return { label, color };
    }
    if (modelType === 'local' && currentModel) {
      return { label: `Modèle Local : ${currentModel}`, color: 'blue' };
    }
    return { label: 'Modèle non chargé', color: 'red' };
  };

  // Fonction memoizée pour récupérer les informations du modèle
  const setSerpApiKey = async (apiKey) => {
    try {
      setModelInfo(prev => ({
        ...prev,
        isLoading: true
      }));

      console.log("Envoi de la clé SerpAPI:", apiKey.substring(0, 5) + "...");

      const response = await axios.post('/api/set-serpapi-key', {
        api_key: apiKey
      });

      console.log("Réponse de set-serpapi-key:", response.data);

      if (response.data.status === 'SerpAPI key set successfully') {
        // Mettre à jour l'état immédiatement avec la nouvelle clé
        setModelInfo(prev => ({
          ...prev,
          serpapi_key: apiKey,
          isLoading: false
        }));

        // Enregistrer la clé API dans le localStorage
        localStorage.setItem('serpapi_key', apiKey);

        // Vérification supplémentaire en console
        console.log("SerpAPI key configurée avec succès:", apiKey.substring(0, 5) + "...");
        console.log("État modelInfo après mise à jour:", {
          ...modelInfo, 
          serpapi_key: apiKey.substring(0, 5) + "..."
        });

        notifications.show({
          title: 'Succès',
          message: 'Clé API SerpAPI configurée avec succès',
          color: 'green'
        });

        return true;
      }
    } catch (error) {
      console.error('Erreur lors de la configuration de la clé API SerpAPI:', error);
      
      setModelInfo(prev => ({
        ...prev,
        isLoading: false
      }));

      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.detail || 'Erreur lors de la configuration de la clé API SerpAPI',
        color: 'red'
      });

      return false;
    }
  };

  // Dans useEffect initial, charger la clé SerpAPI depuis localStorage
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Vérifier s'il y a des clés API sauvegardées dans le localStorage
        const savedApiKey = localStorage.getItem('api_key');
        const savedModelType = localStorage.getItem('model_type');
        const savedModelName = localStorage.getItem('model_name');
        const savedSerpApiKey = localStorage.getItem('serpapi_key');
        
        console.log("Clé SerpAPI trouvée dans localStorage:", savedSerpApiKey ? "Oui" : "Non");
        
        // Si une clé SerpAPI est sauvegardée, la définir dans le modelInfo
        if (savedSerpApiKey) {
          console.log("Chargement de la clé SerpAPI depuis localStorage");
          setModelInfo(prev => ({
            ...prev,
            serpapi_key: savedSerpApiKey
          }));
          
          // Vérifier auprès du serveur que la clé est bien configurée
          try {
            const response = await axios.get('/api/turbosearch-stats');
            if (response.data.serpapi_key_configured) {
              console.log("Clé SerpAPI confirmée par le serveur");
            } else {
              console.log("Clé SerpAPI non détectée par le serveur, envoi de la clé");
              await axios.post('/api/set-serpapi-key', {
                api_key: savedSerpApiKey
              });
            }
          } catch (error) {
            console.warn("Erreur lors de la vérification de la clé SerpAPI:", error);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du modèle:', error);
        setModelInfo({
          status: 'error',
          isLoading: false,
          isConnected: false,
          modelType: null,
          modelName: null,
          apiKey: null,
          serpapi_key: null,  // Ajouter cette ligne
          isLocal: false,
          localModels: []
        });
      }
    };

    checkStatus();
  }, []);

  const value = {
        models,
    apiModels,
        currentModel,
        modelDetails,
        loading,
        error,
        fetchModelInfo,
        changeModel,
    testApiKey,
    setExternalApi,
    tokenUsage,
    parameters,
        updateParameters,
    modelType,
    apiKey,
    apiModelSelected,
    getTonePrompt,
    model_info: modelInfo,
    getModelStatus,
    setSerpApiKey,
    modelInfo
  };

  return (
    <ModelContext.Provider
      value={value}
    >
      {children}
    </ModelContext.Provider>
  );
}; 