import { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Group, 
  Select, 
  Loader, 
  Alert,
  Divider,
  Stack,
  Badge,
  Card,
  Progress,
  Grid,
  Slider,
  NumberInput,
  Code,
  Accordion,
  Tooltip,
  Tabs,
  TextInput,
  PasswordInput,
  Switch,
  Anchor
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconInfoCircle, 
  IconCheck, 
  IconX, 
  IconCpu, 
  IconBrain, 
  IconSettings, 
  IconGauge,
  IconRefresh,
  IconServer,
  IconCloud,
  IconRocket,
  IconBrandGoogle,
  IconBrandOpenai,
  IconSearch
} from '@tabler/icons-react';
import axios from 'axios';
import { useModel } from '../contexts/ModelContext';

const Settings = () => {
  const { 
    models, 
    apiModels,
    currentModel, 
    modelDetails, 
    loading, 
    error, 
    fetchModelInfo, 
    changeModel, 
    setExternalApi,
    parameters, 
    updateParameters,
    modelType,
    apiKey,
    apiModelSelected,
    getModelStatus,
    setSerpApiKey,
    modelInfo
  } = useModel();
  
  const [selectedModel, setSelectedModel] = useState('');
  const [changing, setChanging] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [advancedOptions, setAdvancedOptions] = useState({
    n_ctx: 4096,
    n_batch: 512,
    n_gpu_layers: 0
  });
  
  // État pour la configuration API
  const [apiType, setApiType] = useState('openai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiModelName, setApiModelName] = useState('');
  const [useApiModel, setUseApiModel] = useState(modelType !== 'local');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelDetectionSuccess, setModelDetectionSuccess] = useState(false);
  const [apiKeys, setApiKeys] = useState({});
  const [customModelId, setCustomModelId] = useState('');
  const [showCustomModelInput, setShowCustomModelInput] = useState(false);
  
  // Ajouter état pour la clé SerpAPI
  const [serpApiKeyValue, setSerpApiKeyValue] = useState('');
  const [savingSerpApiKey, setSavingSerpApiKey] = useState(false);
  
  const modelStatus = getModelStatus();
  
  // Liste des modèles Qwen recommandés pour OpenRouter
  const recommendedQwenModels = [
    { id: "qwen/qwen3-235b-a22b:free", name: "Qwen3 235B Ultra", description: "Modèle ultra-puissant, le plus grand de la série (sans streaming)" },
    { id: "qwen/qwen3-30b-a3b:free", name: "Qwen3 30B", description: "Excellent rapport performances/vitesse (sans streaming)" },
    { id: "qwen/qwen3-32b:free", name: "Qwen3 32B", description: "Version alternative de 32B (sans streaming)" },
    { id: "qwen/qwen3-14b:free", name: "Qwen3 14B", description: "Version plus compacte, bonnes performances" }
  ];

  // Charger les statistiques système
  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const response = await axios.get('/api/system-stats');
        setSystemStats(response.data);
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques système:', err);
      }
    };

    fetchSystemStats();
    
    // Mettre à jour les statistiques toutes les 30 secondes
    const interval = setInterval(fetchSystemStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Charger les clés API sauvegardées au démarrage
  useEffect(() => {
    const savedKeys = localStorage.getItem('turbochat_api_keys');
    if (savedKeys) {
      const parsedKeys = JSON.parse(savedKeys);
      setApiKeys(parsedKeys);
    }
  }, []);

  // Mettre à jour la sélection du modèle quand le modèle courant change
  useEffect(() => {
    if (currentModel) {
      setSelectedModel(currentModel);
    }
  }, [currentModel]);

  // Mettre à jour l'UI quand le modèle change
  useEffect(() => {
    setUseApiModel(modelType !== 'local');
    if (modelType === 'openai' || modelType === 'gemini' || modelType === 'groq' || modelType === 'openrouter') {
      setApiType(modelType);
    }
  }, [modelType]);
  
  // Mettre à jour les modèles API disponibles quand le type d'API change
  useEffect(() => {
    if (apiType && apiModels && apiModels[apiType]) {
      setApiModelName(apiModels[apiType][0]?.id || '');
      setShowCustomModelInput(apiType === 'openrouter');
    }
  }, [apiType, apiModels]);

  // Mettre à jour la clé SerpAPI au chargement
  useEffect(() => {
    // Si la clé SerpAPI est définie dans le modelInfo, la définir dans l'état local
    if (modelInfo?.serpapi_key) {
      setSerpApiKeyValue(modelInfo.serpapi_key);
    }
  }, [modelInfo]);

  // Détecter les modèles disponibles après avoir entré une clé API
  const detectAvailableModels = async () => {
    if (!apiKeyInput.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer une clé API valide',
        color: 'red',
      });
      return;
    }
    
    setIsLoadingModels(true);
    setModelDetectionSuccess(false);
    
    try {
      // Déterminer le modèle par défaut en fonction du type d'API
      let defaultModel;
      switch(apiType) {
        case 'gemini':
          defaultModel = 'gemini-1.5-flash';
          break;
        case 'groq':
          defaultModel = 'llama-3.1-8b-instant';
          break;
        case 'openrouter':
          defaultModel = 'google/gemini-2.0-flash-exp:free';
          break;
        default:
          defaultModel = 'gpt-3.5-turbo';
      }
      
      // Envoyer la clé API pour tester la connexion et récupérer les modèles
      const response = await axios.post('/api/set-api-key', {
        model_type: apiType,
        api_key: apiKeyInput,
        model_name: defaultModel
      });
      
      if (response.data.status === 'API key set successfully') {
        // Sauvegarder la clé API dans le localStorage
        const updatedKeys = { ...apiKeys, [apiType]: apiKeyInput };
        localStorage.setItem('turbochat_api_keys', JSON.stringify(updatedKeys));
        setApiKeys(updatedKeys);
        
        // Rafraîchir la liste des modèles
        await fetchModelInfo();
        
        // Récupérer la liste mise à jour des modèles API
        const modelsResponse = await axios.get('/api/api-models');
        if (modelsResponse.data && modelsResponse.data.models && modelsResponse.data.models[apiType]) {
          const models = modelsResponse.data.models[apiType];
          
          notifications.show({
            title: 'Succès',
            message: `${models.length} modèles ${apiType.toUpperCase()} détectés`,
            color: 'green',
            icon: <IconCheck size={16} />,
          });
          
          setModelDetectionSuccess(true);
          
          // Sélectionner le premier modèle par défaut
          if (models.length > 0) {
            setApiModelName(models[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Erreur lors de la détection des modèles:', err);
      
      notifications.show({
        title: 'Erreur',
        message: `Impossible de détecter les modèles: ${err.message}`,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Changer de modèle local
  const handleChangeModel = async () => {
    if (!selectedModel) return;

    setChanging(true);
    try {
      const success = await changeModel(selectedModel);
      
      if (!success) {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de changer le modèle',
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } catch (err) {
      console.error('Erreur lors du changement de modèle:', err);
    } finally {
      setChanging(false);
    }
  };
  
  // Configurer l'API externe
  const handleSetApiKey = async () => {
    // Validation stricte pour OpenRouter
    if (apiType === 'openrouter' && !apiKeyInput.trim().startsWith('sk-or-')) {
      notifications.show({
        title: 'Erreur',
        message: 'La clé OpenRouter doit commencer par sk-or-.',
        color: 'red',
      });
      return;
    }
    
    // Utiliser le customModelId si openrouter et showCustomModelInput sont activés
    const finalModelName = (apiType === 'openrouter' && showCustomModelInput && customModelId) 
      ? customModelId 
      : apiModelName;
    
    if (!apiKeyInput.trim() || !finalModelName) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez fournir une clé API et sélectionner un modèle',
        color: 'red',
      });
      return;
    }
    
    // Vérifier le format de clé API
    const keyFormats = {
      openrouter: key => key.startsWith('sk-or-'),
      gemini: key => key.startsWith('AIza'),
      groq: key => key.startsWith('gsk_'),
      openai: key => key.startsWith('sk-') && !key.startsWith('sk-or-')
    };
    
    if (keyFormats[apiType] && !keyFormats[apiType](apiKeyInput)) {
      const confirmContinue = window.confirm(
        `La clé API que vous avez entrée ne semble pas être au format attendu pour ${apiType}.\n\n` +
        `OpenRouter: sk-or-...\n` +
        `Gemini: AIza...\n` +
        `Groq: gsk_...\n` +
        `OpenAI: sk-...\n\n` +
        `Voulez-vous continuer quand même?`
      );
      
      if (!confirmContinue) {
        return;
      }
    }
    
    setChanging(true);
    try {
      const success = await setExternalApi(apiType, apiKeyInput, finalModelName);
      
      if (success) {
        // Sauvegarder la clé API dans le localStorage uniquement pour ce service spécifique
        const updatedKeys = { ...apiKeys, [apiType]: apiKeyInput };
        localStorage.setItem('turbochat_api_keys', JSON.stringify(updatedKeys));
        setApiKeys(updatedKeys);
        
        notifications.show({
          title: 'Modèle configuré',
          message: `L'API ${apiType} a été configurée avec le modèle ${finalModelName}`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (err) {
      console.error('Erreur lors de la configuration de l\'API:', err);
    } finally {
      setChanging(false);
    }
  };

  // Changer les paramètres avancés du modèle
  const handleAdvancedModelChange = async () => {
    if (!selectedModel) return;

    setChanging(true);
    try {
      const response = await axios.post('/api/change-model', {
        model_file: selectedModel,
        n_ctx: advancedOptions.n_ctx,
        n_batch: advancedOptions.n_batch,
        n_gpu_layers: advancedOptions.n_gpu_layers
      });
      
      if (response.data.status === 'Model changed successfully') {
        notifications.show({
          title: 'Succès',
          message: `Le modèle a été changé avec les paramètres avancés`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        
        // Mettre à jour les infos du modèle
        fetchModelInfo();
      }
    } catch (err) {
      console.error('Erreur lors du changement de modèle:', err);
      
      notifications.show({
        title: 'Erreur',
        message: `Impossible de changer le modèle: ${err.message}`,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setChanging(false);
    }
  };

  // Ajouter la fonction pour configurer la clé SerpAPI
  const handleSetSerpApiKey = async () => {
    if (!serpApiKeyValue.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer une clé API SerpAPI valide',
        color: 'red',
      });
      return;
    }
    
    setSavingSerpApiKey(true);
    
    try {
      // Utiliser la fonction du contexte pour définir la clé
      const success = await setSerpApiKey(serpApiKeyValue);
      
      if (success) {
        notifications.show({
          title: 'Succès',
          message: 'Clé API SerpAPI configurée avec succès',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (err) {
      console.error('Erreur lors de la configuration de la clé SerpAPI:', err);
      
      notifications.show({
        title: 'Erreur',
        message: `Erreur lors de la configuration de la clé API SerpAPI: ${err.message}`,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSavingSerpApiKey(false);
    }
  };

  const handleKeyChange = (service, value) => {
    const updatedKeys = {
      ...apiKeys,
      [service]: value
    };
    setApiKeys(updatedKeys);
    localStorage.setItem('turbochat_api_keys', JSON.stringify(updatedKeys));
    
    // Notification de succès
    notifications.show({
      title: 'Clé API mise à jour',
      message: `La clé ${service.toUpperCase()} a été sauvegardée`,
      color: 'green',
    });
  };

  const handleClearAllKeys = () => {
    setApiKeys({});
    localStorage.setItem('turbochat_api_keys', JSON.stringify({}));
    notifications.show({
      title: 'Clés supprimées',
      message: 'Toutes les clés API ont été supprimées',
      color: 'blue',
    });
  };

  if (loading && !systemStats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <Stack>
      <Paper shadow="sm" p="md">
        <Title order={3} mb="md">Type de modèle</Title>

        <Group mb="lg">
          <div style={{ flex: 1 }}>
            <Text fw={500} mb={5}>Modèle actuel</Text>
            <Badge size="lg" color={modelStatus.color}>{modelStatus.label}</Badge>
          </div>
            <div>
            <Text fw={500} mb={5}>Statut</Text>
            <Badge color={modelStatus.color} size="lg">{modelStatus.label === 'Erreur' ? 'Erreur' : 'Opérationnel'}</Badge>
            </div>
        </Group>

        <Tabs defaultValue="local">
          <Tabs.List mb="md">
            <Tabs.Tab value="local" icon={<IconServer size={14} />}>
              Modèle Local
            </Tabs.Tab>
            <Tabs.Tab value="api" icon={<IconCloud size={14} />}>
              APIs Externes
            </Tabs.Tab>
            <Tabs.Tab value="system" icon={<IconServer size={14} />}>
              Système
            </Tabs.Tab>
            <Tabs.Tab value="turbosearch" icon={<IconSearch size={14} />}>
              Turbo Search
            </Tabs.Tab>
          </Tabs.List>
          
          <Tabs.Panel value="local">
            <Paper p="md" withBorder>
              <Title order={4} mb="md">Changer de modèle local</Title>
        <Group>
          <Select
            label="Sélectionner un modèle"
            placeholder="Choisir un modèle"
            data={models.map(model => ({ 
              value: model.filename, 
              label: `${model.filename} (${model.size_gb} GB)${model.is_active ? ' - Actif' : ''}` 
            }))}
            value={selectedModel}
            onChange={setSelectedModel}
            style={{ flex: 1 }}
            searchable
            clearable
          />

          <Button 
            onClick={handleChangeModel} 
            disabled={!selectedModel || changing}
            loading={changing}
            style={{ alignSelf: 'flex-end', marginBottom: '3px' }}
          >
            Changer de modèle
          </Button>
        </Group>
      </Paper>
          </Tabs.Panel>
          
          <Tabs.Panel value="api">
            <Paper withBorder p="md" mb="lg">
              <Tabs defaultValue="openrouter">
                <Tabs.List mb="md">
                  <Tabs.Tab value="openrouter" icon={<IconRocket size={14} />}>
                    OpenRouter
                  </Tabs.Tab>
                  <Tabs.Tab value="gemini" icon={<IconBrandGoogle size={14} />}>
                    Google Gemini
                  </Tabs.Tab>
                  <Tabs.Tab value="groq" icon={<IconSettings size={14} />}>
                    Groq
                  </Tabs.Tab>
                  <Tabs.Tab value="openai" icon={<IconBrandOpenai size={14} />}>
                    OpenAI
                  </Tabs.Tab>
                </Tabs.List>
                
                <Tabs.Panel value="openrouter">
                  <Grid>
                    <Grid.Col span={6}>
                      <PasswordInput
                        label="Clé API OpenRouter"
                        placeholder="sk-or-..."
                        value={apiType === 'openrouter' ? apiKeyInput : apiKeys['openrouter'] || ''}
                        onChange={(e) => {
                          setApiType('openrouter');
                          setApiKeyInput(e.target.value);
                        }}
                        mb="md"
                      />
                      
                      <Button 
                        onClick={() => {
                          // Préserver la clé actuelle lors de la détection des modèles
                          const currentKey = apiKeyInput || apiKeys['openrouter'] || '';
                          if (currentKey) {
                            setApiType('openrouter');
                            setApiKeyInput(currentKey);
                            detectAvailableModels();
                          }
                        }}
                        loading={apiType === 'openrouter' && isLoadingModels}
                        leftSection={<IconRefresh size={16} />}
                        disabled={!apiKeyInput.trim() && !apiKeys['openrouter']}
                        variant="outline"
                        mb="md"
                      >
                        Détecter les modèles disponibles
                      </Button>
                      
                      <Title order={5} mb="md">Modèles Qwen recommandés</Title>
                      <Grid>
                        {recommendedQwenModels.map((model) => (
                          <Grid.Col span={6} key={model.id}>
                            <Card 
                              p="sm" 
                              withBorder
                              style={{ 
                                cursor: 'pointer',
                                borderColor: apiModelName === model.id ? 'blue' : undefined,
                                backgroundColor: apiModelName === model.id ? '#f0f9ff' : undefined 
                              }}
                              onClick={() => {
                                setApiType('openrouter');
                                setApiModelName(model.id);
                                setShowCustomModelInput(false);
                                // Préserver la clé actuelle
                                const currentKey = apiKeyInput || apiKeys['openrouter'] || '';
                                if (currentKey) {
                                  setApiKeyInput(currentKey);
                                }
                              }}
                            >
                              <Text fw={500} size="sm">{model.name}</Text>
                              <Text size="xs" color="dimmed" lineClamp={2}>{model.description}</Text>
                              <Badge mt="xs" size="xs" color="orange">Qwen</Badge>
                            </Card>
                          </Grid.Col>
                        ))}
                      </Grid>
                      
                      <Title order={5} mt="lg" mb="md">Autres modèles</Title>
                      
                      <Group>
                        <Switch
                          label="Modèle personnalisé"
                          checked={showCustomModelInput}
                          onChange={(event) => {
                            setShowCustomModelInput(event.currentTarget.checked);
                            if (!event.currentTarget.checked) {
                              setApiModelName(apiModels['openrouter']?.[0]?.id || '');
                            }
                          }}
                        />
                      </Group>
                      
                      {showCustomModelInput ? (
                        <TextInput
                          label="ID du modèle personnalisé"
                          placeholder="google/gemini-2.5-pro-exp-03-25"
                          value={customModelId}
                          onChange={(e) => setCustomModelId(e.target.value)}
                          mt="md"
                        />
                      ) : (
                        <Select
                          label="Autres modèles disponibles"
                          placeholder="Sélectionner un modèle"
                          data={apiModels['openrouter']?.filter(model => 
                            !recommendedQwenModels.some(qwen => qwen.id === model.id)
                          ).map(model => ({
                            value: model.id,
                            label: model.name,
                            description: model.description
                          })) || []}
                          value={apiModelName}
                          onChange={setApiModelName}
                          mt="md"
                          disabled={!modelDetectionSuccess && apiModels['openrouter']?.length === 0}
                          searchable
                          nothingFound="Aucun modèle détecté"
                          itemComponent={({ label, description, ...others }) => (
                            <div {...others}>
                              <Group noWrap>
                                <div>
                                  <Text>{label}</Text>
                                  {description && (
                                    <Text size="xs" color="dimmed">
                                      {description}
                                    </Text>
                                  )}
                                </div>
                              </Group>
                            </div>
                          )}
                        />
                      )}
                      
                      <Button 
                        onClick={() => {
                          setApiType('openrouter');
                          handleSetApiKey();
                        }} 
                        loading={apiType === 'openrouter' && changing}
                        disabled={
                          !apiKeyInput || 
                          (showCustomModelInput && !customModelId) || 
                          (!showCustomModelInput && !apiModelName)
                        }
                        mt="md"
                        fullWidth
                        color="blue"
                      >
                        Configurer OpenRouter
                      </Button>
                    </Grid.Col>
                    
                    <Grid.Col span={6}>
                      <Card withBorder p="md" h="100%">
                        <Title order={5} mb="xs">À propos d'OpenRouter</Title>
                        <Text size="sm" mb="xs">OpenRouter est un service qui donne accès à de nombreux modèles d'IA gratuitement.</Text>
                        <Text size="sm" mb="md">La clé API peut être obtenue ici:</Text>
                        <Text component="a" href="https://openrouter.ai/keys" target="_blank" rel="noopener" size="sm" c="blue" mb="lg" display="block">
                          https://openrouter.ai/keys
                        </Text>
                        
                        <Title order={6} mt="lg" mb="xs">Modèles Qwen</Title>
                        <Text size="sm" color="dimmed" mb="xs">
                          Ils ne supportent pas le streaming mais TurboChat est optimisé pour les utiliser.
                        </Text>
                        
                        <Title order={6} mt="lg" mb="xs">Autres modèles gratuits recommandés</Title>
                        <Text size="sm">• google/gemini-2.0-flash-exp:free (Rapide)</Text>
                        <Text size="sm">• meta-llama/llama-4-scout:free (Efficient)</Text>
                        <Text size="sm">• meta-llama/llama-4-maverick:free (Avancé)</Text>
                        <Text size="sm">• deepseek/deepseek-r1:free (Open source)</Text>
                        
                        <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
                          <Text size="xs">
                            OpenRouter est la solution recommandée pour utiliser les meilleurs modèles sans abonnement payant.
                            Les modèles Qwen sont particulièrement recommandés pour leurs excellentes performances.
                          </Text>
                        </Alert>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>
                
                <Tabs.Panel value="gemini">
                  <Grid>
                    <Grid.Col span={6}>
                      <PasswordInput
                        label="Clé API Google Gemini"
                        placeholder="AIza..."
                        value={apiType === 'gemini' ? apiKeyInput : apiKeys['gemini'] || ''}
                        onChange={(e) => {
                          setApiType('gemini');
                          setApiKeyInput(e.target.value);
                        }}
                        mb="md"
                      />
                      
                      <Button 
                        onClick={() => {
                          // Préserver la clé actuelle lors de la détection des modèles
                          const currentKey = apiKeyInput || apiKeys['gemini'] || '';
                          if (currentKey) {
                            setApiType('gemini');
                            setApiKeyInput(currentKey);
                            detectAvailableModels();
                          }
                        }}
                        loading={apiType === 'gemini' && isLoadingModels}
                        leftSection={<IconRefresh size={16} />}
                        disabled={!apiKeyInput.trim() && !apiKeys['gemini']}
                        variant="outline"
                        mb="md"
                      >
                        Détecter les modèles disponibles
                      </Button>
                      
                      <Select
                        label="Modèle Gemini"
                        placeholder="Sélectionner un modèle"
                        data={apiModels['gemini']?.map(model => ({
                          value: model.id,
                          label: model.name,
                          description: model.description
                        })) || [
                          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Modèle rapide et économique' },
                          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Modèle avancé' },
                          { value: 'gemini-pro', label: 'Gemini Pro', description: 'Modèle polyvalent' }
                        ]}
                        value={apiType === 'gemini' ? apiModelName : ''}
                        onChange={(value) => {
                          setApiType('gemini');
                          setApiModelName(value);
                          // Préserver la clé actuelle
                          const currentKey = apiKeyInput || apiKeys['gemini'] || '';
                          if (currentKey) {
                            setApiKeyInput(currentKey);
                          }
                        }}
                        mb="md"
                        searchable
                        nothingFound="Aucun modèle détecté"
                      />
                      
                      <Button 
                        onClick={() => {
                          setApiType('gemini');
                          handleSetApiKey();
                        }} 
                        loading={apiType === 'gemini' && changing}
                        disabled={!apiKeyInput || !apiModelName}
                        mt="md"
                        fullWidth
                        color="blue"
                      >
                        Configurer Gemini
                      </Button>
                    </Grid.Col>
                    
                    <Grid.Col span={6}>
                      <Card withBorder p="md" h="100%">
                        <Title order={5} mb="xs">À propos de Google Gemini</Title>
                        <Text size="sm" mb="xs">Les modèles Gemini sont développés par Google et offrent d'excellentes performances.</Text>
                        <Text size="sm" mb="md">La clé API peut être obtenue ici:</Text>
                        <Text component="a" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" size="sm" c="blue" mb="lg" display="block">
                          https://aistudio.google.com/app/apikey
                        </Text>
                        
                        <Title order={6} mt="lg" mb="xs">Modèles recommandés</Title>
                        <Text size="sm">• gemini-1.5-flash (rapide et gratuit)</Text>
                        <Text size="sm">• gemini-pro (plus puissant)</Text>
                        
                        <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
                          <Text size="xs">
                            L'API Gemini propose une offre gratuite avec des limites de 1M de tokens par minute et 1500 requêtes par jour,
                            ce qui est largement suffisant pour un usage personnel.
                          </Text>
                        </Alert>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>
                
                <Tabs.Panel value="groq">
                  <Grid>
                    <Grid.Col span={6}>
                      <PasswordInput
                        label="Clé API Groq"
                        placeholder="gsk_..."
                        value={apiType === 'groq' ? apiKeyInput : apiKeys['groq'] || ''}
                        onChange={(e) => {
                          setApiType('groq');
                          setApiKeyInput(e.target.value);
                        }}
                        mb="md"
                      />
                      
                      <Button 
                        onClick={() => {
                          setApiType('groq');
                          detectAvailableModels();
                        }}
                        loading={apiType === 'groq' && isLoadingModels}
                        leftSection={<IconRefresh size={16} />}
                        disabled={!apiKeyInput.trim() && apiType === 'groq'}
                        variant="outline"
                        mb="md"
                      >
                        Détecter les modèles disponibles
                      </Button>
                      
                      <Select
                        label="Modèle Groq"
                        placeholder="Sélectionner un modèle"
                        data={apiModels['groq']?.map(model => ({
                          value: model.id,
                          label: model.name,
                          description: model.description
                        })) || [
                          { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', description: 'Ultra-rapide (100x GPT-4)' },
                          { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile', description: 'Performances excellentes' },
                          { value: 'llama3-8b-8192', label: 'Llama3 8B', description: 'Modèle compact mais puissant' },
                          { value: 'llama3-70b-8192', label: 'Llama3 70B', description: 'Capacité élite' },
                          { value: 'gemma2-9b-it', label: 'Gemma2 9B IT', description: 'Modèle Google efficace' }
                        ]}
                        value={apiType === 'groq' ? apiModelName : ''}
                        onChange={(value) => {
                          setApiType('groq');
                          setApiModelName(value);
                        }}
                        mb="md"
                        searchable
                        nothingFound="Aucun modèle détecté"
                      />
                      
                      <Button 
                        onClick={() => {
                          setApiType('groq');
                          handleSetApiKey();
                        }} 
                        loading={apiType === 'groq' && changing}
                        disabled={!apiKeyInput || !apiModelName}
                        mt="md"
                        fullWidth
                        color="blue"
                      >
                        Configurer Groq
                      </Button>
                    </Grid.Col>
                    
                    <Grid.Col span={6}>
                      <Card withBorder p="md" h="100%">
                        <Title order={5} mb="xs">À propos de Groq</Title>
                        <Text size="sm" mb="xs">Groq offre l'accès aux modèles Llama et d'autres modèles open source avec une inférence ultra-rapide.</Text>
                        <Text size="sm" mb="md">La clé API peut être obtenue ici:</Text>
                        <Text component="a" href="https://console.groq.com/keys" target="_blank" rel="noopener" size="sm" c="blue" mb="lg" display="block">
                          https://console.groq.com/keys
                        </Text>
                        
                        <Title order={6} mt="lg" mb="xs">Modèles recommandés</Title>
                        <Text size="sm">• llama-3.1-8b-instant (Ultra-rapide)</Text>
                        <Text size="sm">• llama-3.1-70b-versatile (Excellent pour tâches complexes)</Text>
                        <Text size="sm">• mixtral-8x7b-32768 (Grande capacité de contexte)</Text>
                        
                        <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
                          <Text size="xs">
                            Groq offre un niveau gratuit permettant jusqu'à 100 000 tokens par jour,
                            ce qui est suffisant pour un usage personnel modéré.
                          </Text>
                        </Alert>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>
                
                <Tabs.Panel value="openai">
                  <Grid>
                    <Grid.Col span={6}>
                      <PasswordInput
                        label="Clé API OpenAI"
                        placeholder="sk-..."
                        value={apiType === 'openai' ? apiKeyInput : apiKeys['openai'] || ''}
                        onChange={(e) => {
                          setApiType('openai');
                          setApiKeyInput(e.target.value);
                        }}
                        mb="md"
                      />
                      
                      <Button 
                        onClick={() => {
                          setApiType('openai');
                          detectAvailableModels();
                        }}
                        loading={apiType === 'openai' && isLoadingModels}
                        leftSection={<IconRefresh size={16} />}
                        disabled={!apiKeyInput.trim() && apiType === 'openai'}
                        variant="outline"
                        mb="md"
                      >
                        Détecter les modèles disponibles
                      </Button>
                      
                      <Select
                        label="Modèle OpenAI"
                        placeholder="Sélectionner un modèle"
                        data={apiModels['openai']?.map(model => ({
                          value: model.id,
                          label: model.name,
                          description: model.description
                        })) || [
                          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Efficace et économique' },
                          { value: 'gpt-4', label: 'GPT-4', description: 'Modèle avancé' },
                          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Version optimisée du GPT-4' },
                          { value: 'gpt-4o', label: 'GPT-4o', description: 'Version omniscient de GPT-4' }
                        ]}
                        value={apiType === 'openai' ? apiModelName : ''}
                        onChange={(value) => {
                          setApiType('openai');
                          setApiModelName(value);
                        }}
                        mb="md"
                        searchable
                        nothingFound="Aucun modèle détecté"
                      />
                      
                      <Button 
                        onClick={() => {
                          setApiType('openai');
                          handleSetApiKey();
                        }} 
                        loading={apiType === 'openai' && changing}
                        disabled={!apiKeyInput || !apiModelName}
                        mt="md"
                        fullWidth
                        color="blue"
                      >
                        Configurer OpenAI
                      </Button>
                    </Grid.Col>
                    
                    <Grid.Col span={6}>
                      <Card withBorder p="md" h="100%">
                        <Title order={5} mb="xs">À propos d'OpenAI</Title>
                        <Text size="sm" mb="xs">OpenAI offre des modèles de langage parmi les plus puissants du marché, notamment la famille GPT.</Text>
                        <Text size="sm" mb="md">La clé API peut être obtenue ici:</Text>
                        <Text component="a" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" size="sm" c="blue" mb="lg" display="block">
                          https://platform.openai.com/api-keys
                        </Text>
                        
                        <Title order={6} mt="lg" mb="xs">Modèles recommandés</Title>
                        <Text size="sm">• gpt-3.5-turbo (Économique et rapide)</Text>
                        <Text size="sm">• gpt-4 (Très puissant mais coûteux)</Text>
                        <Text size="sm">• gpt-4o (Dernière génération)</Text>
                        
                        <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
                          <Text size="xs">
                            L'utilisation de l'API OpenAI nécessite un abonnement payant. Consultez leur grille tarifaire sur leur site.
                            Pour une option gratuite, nous recommandons d'utiliser l'onglet OpenRouter.
                          </Text>
                        </Alert>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Tabs.Panel>
          
          <Tabs.Panel value="system">
      <Paper shadow="sm" p="md">
        <Title order={3} mb="md">Statistiques du système</Title>
        
        {systemStats ? (
          <Grid>
            <Grid.Col span={6}>
              <Card withBorder p="md">
                <Group position="apart" mb="xs">
                  <Text fw={500}><IconCpu size={16} style={{ marginRight: 5 }} /> CPU</Text>
                  <Badge>{systemStats.cpu_percent}%</Badge>
                </Group>
                <Progress 
                  value={systemStats.cpu_percent} 
                  color={systemStats.cpu_percent > 80 ? 'red' : systemStats.cpu_percent > 50 ? 'yellow' : 'blue'} 
                  size="xl" 
                  radius="xl" 
                  mb="md"
                />
                <Text size="sm" c="dimmed">Plateforme: {systemStats.platform}</Text>
              </Card>
            </Grid.Col>
            
            <Grid.Col span={6}>
              <Card withBorder p="md">
                <Group position="apart" mb="xs">
                  <Text fw={500}>Mémoire</Text>
                  <Badge>{systemStats.memory.percent}%</Badge>
                </Group>
                <Progress 
                  value={systemStats.memory.percent} 
                  color={systemStats.memory.percent > 80 ? 'red' : systemStats.memory.percent > 50 ? 'yellow' : 'blue'} 
                  size="xl" 
                  radius="xl" 
                  mb="md"
                />
                <Text size="sm" c="dimmed">
                  {Math.round((systemStats.memory.total - systemStats.memory.available) / 1024 / 1024 / 1024 * 100) / 100} GB / 
                  {Math.round(systemStats.memory.total / 1024 / 1024 / 1024 * 100) / 100} GB
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        ) : (
          <Text c="dimmed">Chargement des statistiques...</Text>
        )}
            </Paper>
          </Tabs.Panel>
          
          <Tabs.Panel value="turbosearch">
            <Paper p="md" withBorder mt="md">
              <Title order={3} mb="md">Configuration de Turbo Search</Title>
              
              <Text mb="md">
                Turbo Search permet d'effectuer des recherches sur le web via DuckDuckGo en utilisant SerpAPI.
                Vous disposez d'un quota de 100 requêtes par mois avec l'API gratuite.
              </Text>
              
              <Alert icon={<IconInfoCircle size={16} />} color="blue" mb="md">
                <Text>
                  Pour utiliser Turbo Search, vous devez créer un compte sur 
                  <Anchor href="https://serpapi.com/users/sign_up" target="_blank" ml={5}>SerpAPI</Anchor> 
                  et obtenir une clé API. La version gratuite vous donne 100 requêtes par mois.
                </Text>
              </Alert>
              
              <Card withBorder p="md" mb="md">
                <Stack spacing="md">
                  <TextInput
                    label="Clé API SerpAPI"
                    description="Votre clé API SerpAPI pour les recherches web"
                    placeholder="Entrez votre clé API SerpAPI"
                    value={serpApiKeyValue}
                    onChange={(e) => setSerpApiKeyValue(e.target.value)}
                    required
                  />
                  
                  <Group position="right">
                    <Button
                      onClick={handleSetSerpApiKey}
                      loading={savingSerpApiKey}
                      leftIcon={<IconSearch size={16} />}
                      disabled={!serpApiKeyValue.trim()}
                    >
                      {modelInfo?.serpapi_key ? 'Mettre à jour la clé API' : 'Enregistrer la clé API'}
                    </Button>
                  </Group>
                </Stack>
              </Card>
              
              {modelInfo?.serpapi_key && (
                <Alert color="green" icon={<IconCheck size={16} />}>
                  <Text>Turbo Search est configuré et prêt à être utilisé.</Text>
                </Alert>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Paper>
      
      <Paper shadow="sm" p="md">
        <Title order={3} mb="md">Paramètres de génération par défaut</Title>
        
        <Grid>
          <Grid.Col span={6}>
            <Text fw={500} mb={5}>Température</Text>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={parameters.temperature}
              onChange={(value) => updateParameters({ temperature: value })}
              marks={[
                { value: 0, label: '0' },
                { value: 0.5, label: '0.5' },
                { value: 1, label: '1' }
              ]}
              mb="lg"
            />
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Text fw={500} mb={5}>Top-P</Text>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={parameters.top_p}
              onChange={(value) => updateParameters({ top_p: value })}
              marks={[
                { value: 0, label: '0' },
                { value: 0.5, label: '0.5' },
                { value: 1, label: '1' }
              ]}
              mb="lg"
            />
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Text fw={500} mb={5}>Pénalisation de fréquence</Text>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={parameters.frequency_penalty}
              onChange={(value) => updateParameters({ frequency_penalty: value })}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' }
              ]}
              mb="lg"
            />
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Text fw={500} mb={5}>Pénalisation de présence</Text>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={parameters.presence_penalty}
              onChange={(value) => updateParameters({ presence_penalty: value })}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' }
              ]}
              mb="lg"
            />
          </Grid.Col>
        </Grid>
      </Paper>
      
      <Paper shadow="sm" p="md">
        <Accordion>
          <Accordion.Item value="advanced">
            <Accordion.Control icon={<IconSettings size={20} />}>
              <Title order={4}>Options avancées du modèle</Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" mb="md">
                Ces options affectent les performances et la consommation mémoire du modèle. 
                Ne modifiez ces valeurs que si vous savez ce que vous faites.
              </Text>
              
              <Grid mb="md">
                <Grid.Col span={4}>
                  <NumberInput
                    label="Contexte (n_ctx)"
                    description="Taille du contexte en tokens"
                    value={advancedOptions.n_ctx}
                    onChange={(value) => setAdvancedOptions(prev => ({ ...prev, n_ctx: value }))}
                    min={512}
                    max={8192}
                    step={512}
                  />
                </Grid.Col>
                
                <Grid.Col span={4}>
                  <NumberInput
                    label="Batch (n_batch)"
                    description="Taille du batch"
                    value={advancedOptions.n_batch}
                    onChange={(value) => setAdvancedOptions(prev => ({ ...prev, n_batch: value }))}
                    min={64}
                    max={1024}
                    step={64}
                  />
                </Grid.Col>
                
                <Grid.Col span={4}>
                  <NumberInput
                    label="GPU Layers"
                    description="Nombre de couches sur GPU"
                    value={advancedOptions.n_gpu_layers}
                    onChange={(value) => setAdvancedOptions(prev => ({ ...prev, n_gpu_layers: value }))}
                    min={0}
                    max={100}
                  />
                </Grid.Col>
              </Grid>
              
              <Button 
                onClick={handleAdvancedModelChange} 
                disabled={!selectedModel || changing}
                loading={changing}
                leftSection={<IconBrain size={16} />}
              >
                Appliquer les paramètres avancés
              </Button>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>
    </Stack>
  );
};

export default Settings; 