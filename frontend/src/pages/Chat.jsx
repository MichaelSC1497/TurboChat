import { useState, useRef, useEffect } from 'react';
import { 
  TextInput, 
  Button, 
  Paper, 
  Text, 
  ScrollArea, 
  Loader,
  Title,
  Box,
  Group,
  Select,
  Textarea,
  Badge,
  ActionIcon,
  Tooltip,
  Grid,
  Progress,
  Card,
  Menu,
  Modal,
  Collapse,
  Stack,
  Avatar,
  Divider,
  Transition,
  useMantineTheme,
  Switch,
  Tabs,
  NumberInput,
  Center,
  Popover,
  Accordion,
  Anchor,
  Code,
  List
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useHover, useDisclosure } from '@mantine/hooks';
import { 
  IconSend, 
  IconRobot, 
  IconUser, 
  IconDownload, 
  IconClock, 
  IconTemperature, 
  IconPlus, 
  IconCheck, 
  IconX, 
  IconSettings, 
  IconDatabase, 
  IconSearch, 
  IconMaximize, 
  IconMinimize, 
  IconTrash, 
  IconPencil, 
  IconRefresh, 
  IconCopy, 
  IconChevronRight, 
  IconChevronDown, 
  IconInfoCircle, 
  IconFileText, 
  IconServer, 
  IconExternalLink, 
  IconZoomQuestion, 
  IconAlertCircle,
  IconMessageChatbot,
  IconMessage,
  IconBrush
} from '@tabler/icons-react';
import axios from 'axios';
import { useConversation } from '../contexts/ConversationContext';
import { useModel } from '../contexts/ModelContext';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

// Wrap components with motion for animations
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionAvatar = motion(Avatar);
const MotionBadge = motion(Badge);

// Composant pour afficher un message avec animations
const Message = ({ 
  content, 
  role, 
  metrics, 
  index, 
  timestamp,
  edited,
  editTimestamp,
  regenerated,
  regenerateTimestamp,
  onEdit, 
  onDelete, 
  onRegenerate, 
  onCopy,
  useRag,
  ragCollection,
  useTurboSearch,
  search_info,
  onShowRagSources,
  onShowSearchSources,
  isNew = false
}) => {
  const [menuOpened, setMenuOpened] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();
  
  // Format de la date en format lisible
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Vérifier si les badges doivent être affichés
  const shouldShowTurboSearchBadge = useTurboSearch && search_info;
  const shouldShowRagBadge = useRag && ragCollection;

  return (
    <MotionPaper 
      ref={ref}
      shadow={role === 'user' ? "xs" : "sm"}
      p="xs"
      mb="sm"
      radius="md"
      style={{ 
        backgroundColor: role === 'user' ? theme.colors.blue[0] : 'white',
        borderLeft: role === 'assistant' ? `3px solid ${theme.colors.blue[5]}` : 'none',
        marginLeft: role === 'user' ? 'auto' : '0',
        marginRight: role === 'user' ? '0' : 'auto',
        maxWidth: '94%',
        width: 'auto',
        borderRadius: role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0'
      }}
      initial={isNew ? { opacity: 0, y: 20 } : false}
      animate={isNew ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Group gap="xs" align="flex-start">
        {role === 'assistant' && (
          <MotionAvatar 
            size="xs"
            color="cyan"
            radius="xl"
            initial={isNew ? { scale: 0.8 } : false}
            animate={isNew ? { scale: 1 } : false}
            transition={{ delay: 0.1, duration: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <IconRobot size={12} />
          </MotionAvatar>
        )}
        
        <div style={{ flex: 1 }}>
          <Group position="apart" align="center" spacing="xs" mb={1}>
            <Group spacing="xs" align="center">
              <Text fw={500} size="xs">
                {role === 'user' ? 'Vous' : 'Assistant'}
              </Text>
              {timestamp && 
                <Text component="span" c="dimmed" size="xs" style={{ fontSize: '10px' }}>
                  {formatDate(timestamp)}
                </Text>
              }
              {edited && (
                <Badge size="xs" variant="outline" color="gray" 
                  styles={{ root: { fontSize: '9px', height: 16, padding: '0 4px' } }}>
                  Modifié
                </Badge>
        )}
              
              {regenerated && (
                <Badge size="xs" variant="outline" color="indigo"
                  styles={{ root: { fontSize: '9px', height: 16, padding: '0 4px' } }}>
                  Régénéré
                </Badge>
              )}
              
              {shouldShowRagBadge && (
                <Badge 
                  size="xs" 
                  variant="filled" 
                  color="green"
                  styles={{ root: { fontSize: '9px', height: 16, padding: '0 4px', cursor: 'pointer' } }}
                  onClick={() => onShowRagSources ? onShowRagSources(index) : null}
                >
                  RAG: {ragCollection}
                </Badge>
              )}
              
              {shouldShowTurboSearchBadge && (
                <Badge 
                  size="xs" 
                  variant="filled" 
                  color="blue"
                  styles={{ root: { fontSize: '9px', height: 16, padding: '0 4px', cursor: 'pointer' } }}
                  onClick={() => onShowSearchSources ? onShowSearchSources(index) : null}
                >
                  Turbo Search
                </Badge>
              )}
      </Group>
            
            <Menu opened={menuOpened} onChange={setMenuOpened} position="bottom-end">
              <Menu.Target>
                <ActionIcon 
                  variant="subtle" 
                  size="xs" 
                  color="gray"
                >
                  <IconChevronRight size={12} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                {role === 'user' && (
                  <Menu.Item 
                    icon={<IconPencil size={14} />} 
                    onClick={() => onEdit(index, content)}
                  >
                    Modifier ce message
                  </Menu.Item>
                )}
                
                {role === 'assistant' && (
                  <Menu.Item 
                    icon={<IconRefresh size={14} />} 
                    onClick={() => onRegenerate(index)}
                  >
                    Regénérer cette réponse
                  </Menu.Item>
                )}
                
                <Menu.Item 
                  icon={<IconCopy size={14} />} 
                  onClick={() => {
                    navigator.clipboard.writeText(content);
                    notifications.show({
                      title: 'Copié',
                      message: 'Le texte a été copié dans le presse-papier',
                      color: 'green'
                    });
                  }}
                >
                  Copier le contenu
                </Menu.Item>
                
                <Menu.Item 
                  icon={<IconInfoCircle size={14} />} 
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? "Masquer les détails" : "Afficher les détails"}
                </Menu.Item>
                
                <Menu.Divider />
                
                <Menu.Item 
                  icon={<IconTrash size={14} />} 
                  color="red"
                  onClick={() => onDelete(index)}
                >
                  Supprimer
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          
          <div className="markdown-content" style={{ fontSize: '14px' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
    </div>
          
          <Collapse in={showDetails}>
            <Card withBorder mt="xs" p="xs" radius="md">
              {metrics ? (
                <Stack spacing="xs">
                  <Group position="apart" spacing="xs">
                    <Text size="xs">Rôle : {role === 'user' ? 'Utilisateur' : 'Assistant'}</Text>
                    <Text size="xs">Tokens : {metrics.tokens || 'N/A'}</Text>
                  </Group>
                  {metrics.time && (
                    <Text size="xs">Temps de génération : {metrics.time.toFixed(2)}s</Text>
                  )}
                  {timestamp && (
                    <Text size="xs">Horodatage : {formatDate(timestamp)}</Text>
                  )}
                </Stack>
              ) : (
                <Text size="xs">Aucune métrique disponible</Text>
              )}
            </Card>
          </Collapse>
    </div>
        
        {role === 'user' && (
          <MotionAvatar 
            size="xs"
            color="blue"
            radius="xl"
            initial={isNew ? { scale: 0.8 } : false}
            animate={isNew ? { scale: 1 } : false}
            transition={{ delay: 0.1, duration: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <IconUser size={12} />
          </MotionAvatar>
        )}
      </Group>
    </MotionPaper>
  );
};

const Chat = () => {
  // Utiliser les contextes
  const { 
    currentConversation, 
    addMessage,
    createConversation,
    exportConversation,
    updateConversationTitle,
    updateMessage,
    deleteMessage,
    regenerateResponse,
    isInitialized
  } = useConversation();
  
  const {
    parameters,
    updateParameters,
    currentModel,
    modelType,
    getTonePrompt,
    model_info,
    getModelStatus,
    modelInfo
  } = useModel();
  
  // Références
  const viewport = useRef(null);
  const textareaRef = useRef(null);
  const theme = useMantineTheme();
  
  // État pour l'interface
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamController, setStreamController] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [partialResponse, setPartialResponse] = useState('');
  const [newMessages, setNewMessages] = useState([]);
  const [tokenMetrics, setTokenMetrics] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);  // Nouvel état pour empêcher les doublons
  
  // État pour l'édition
  const [editingMessage, setEditingMessage] = useState({ index: -1, content: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [regenerateAfterEdit, setRegenerateAfterEdit] = useState(true);
  
  // État pour la sauvegarde
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  // État pour RAG
  const [useRag, setUseRag] = useState(false);
  const [ragCollection, setRagCollection] = useState('');
  const [ragCollections, setRagCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [ragSourcesModalOpen, setRagSourcesModalOpen] = useState(false);
  const [currentRagMessage, setCurrentRagMessage] = useState(null);
  const [currentRagSources, setCurrentRagSources] = useState([]);
  
  // État pour la recherche web intégrée
  const [useWebSearch, setUseWebSearch] = useState(false);
  
  const navigate = useNavigate();

  const modelStatus = getModelStatus();

  // Ajouter une notification pour déboguer
  useEffect(() => {
    if (model_info) {
      console.log("Model info object:", model_info);
      console.log("serpapi_key présente:", !!model_info.serpapi_key);
    }
  }, [model_info]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (viewport.current) {
      setTimeout(() => {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [currentConversation.messages]);

  // Marquer les nouveaux messages avec une animation
  useEffect(() => {
    if (currentConversation.messages.length > 0) {
      const latestMessageIndex = currentConversation.messages.length - 1;
      if (!newMessages.includes(latestMessageIndex)) {
        setNewMessages(prev => [...prev, latestMessageIndex]);
        
        // Retirer l'animation après 2 secondes
        setTimeout(() => {
          setNewMessages(prev => prev.filter(idx => idx !== latestMessageIndex));
        }, 2000);
      }
    }
  }, [currentConversation.messages.length]);
  
  // Désactiver le streaming par défaut
  useEffect(() => {
    if (parameters.stream) {
      updateParameters({ stream: false });
    }
  }, []);

  // Dans useEffect, ajouter le chargement des collections RAG
  useEffect(() => {
    // Charger les collections RAG disponibles
    const fetchRagCollections = async () => {
      setLoadingCollections(true);
      try {
        const response = await axios.get('/api/rag/collections');
        if (response.data.collections) {
          setRagCollections(response.data.collections);
          // Si des collections sont disponibles, sélectionner la première par défaut
          if (response.data.collections.length > 0) {
            setRagCollection(response.data.collections[0].name);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des collections RAG:', error);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchRagCollections();
  }, []);

  // Fonction pour interrompre la génération de réponse
  const stopResponseGeneration = () => {
    if (streamController) {
      streamController.abort();
      setStreamController(null);
      setIsStreaming(false);
      
      // Add the partially received response as the final response
      if (partialResponse) {
        addMessage({ 
          role: 'assistant', 
          content: partialResponse,
          metrics: {
            tokens: Math.round(partialResponse.length / 4), // Rough estimation
            time: null,
            interrupted: true
          },
          timestamp: new Date()
        });
        setPartialResponse('');
      }
      
      setIsLoading(false);
      
      notifications.show({
        title: 'Génération interrompue',
        message: 'La génération de la réponse a été interrompue',
        color: 'blue',
      });
    }
  };

  // Fonction mise à jour pour envoyer le message, avec support pour la recherche web
  const handleSendMessage = async () => {
    // Vérification renforcée pour éviter les doublons
    if (!input.trim() || isSendingMessage || isLoading || isStreaming) {
      console.log("Envoi bloqué car:", {
        "input vide": !input.trim(),
        "envoi déjà en cours": isSendingMessage,
        "chargement en cours": isLoading,
        "streaming en cours": isStreaming
      });
      return;
    }
    
    try {
      // Marquer comme en cours d'envoi immédiatement
      setIsSendingMessage(true); 
      const userMessage = input.trim();
      
      // Effacer l'input immédiatement pour éviter les doubles soumissions
    setInput('');
      
      // Activer les états de chargement
    setIsLoading(true);
      setErrorMessage(null);
      setStreamedText('');
      
      // Vérifier si TurboSearch est activé mais que la clé API n'est pas configurée
      if (useWebSearch) {
        console.log("TurboSearch activé, vérification de la clé API");
        
        if (!model_info?.serpapi_key) {
          console.log("Pas de clé SerpAPI trouvée, redirection vers les paramètres");
          notifications.show({
            title: 'Configuration requise pour Turbo Search',
            message: 'Veuillez configurer une clé API SerpAPI dans les paramètres pour utiliser Turbo Search',
            color: 'yellow',
          });
          navigate('/settings');
          setIsLoading(false);
          setIsSendingMessage(false);
          return;
        }
      }
      
      // Créer le message utilisateur avec propriétés RAG si activé
      const newUserMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
        useRag: useRag && ragCollection ? true : false,
        ragCollection: useRag ? ragCollection : null
      };
      
      // Ajouter le message à la conversation
      addMessageToConversation(newUserMessage);
      
      // Préparer les messages pour l'API
      const tonePrompt = getTonePrompt();
      const messageWithTone = tonePrompt ? 
        { ...newUserMessage, content: tonePrompt + newUserMessage.content } : 
        newUserMessage;
        
      // Construire le contexte complet de la conversation
      const messages = currentConversation.messages
        .filter(msg => !msg.deleted)
        .map(msg => ({ role: msg.role, content: msg.content }));
      
      if (!messages.some(msg => 
        msg.content === messageWithTone.content && 
        msg.role === messageWithTone.role)
      ) {
        messages.push({ 
          role: messageWithTone.role, 
          content: messageWithTone.content 
        });
      }

      // Préparer la requête pour l'API
      const payload = {
        messages: messages,
        max_tokens: parameters.max_tokens,
        temperature: parameters.temperature,
        top_p: parameters.top_p,
        frequency_penalty: parameters.frequency_penalty,
        presence_penalty: parameters.presence_penalty,
        stream: true
      };

      // Vérifier si nous utilisons un modèle Qwen via OpenRouter
      const isQwenModel = modelType === 'openrouter' && currentModel && 
                          (currentModel.toLowerCase().includes('qwen') || 
                           currentModel.toLowerCase().includes('qwen3'));
      
      if (isQwenModel && useWebSearch) {
        console.log(`Modèle Qwen détecté avec TurboSearch: ${currentModel}, utilisation d'une approche adaptée`);
        
        try {
          // Préparer un payload minimal pour récupérer uniquement les résultats de recherche
          const searchPayload = {
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 1,
            temperature: 0.1,
            stream: false
          };
          
          // Faire d'abord une recherche web via l'API
          console.log("Recherche web via TurboSearch pour modèle Qwen");
          const searchEndpoint = `/api/chat-with-search?search_query=${encodeURIComponent(userMessage)}`;
          
          // Afficher une réponse partielle pour indiquer le chargement
          setIsStreaming(true);
          setPartialResponse("Recherche d'informations sur le web en cours...");
          
          const searchResponse = await axios.post(searchEndpoint, searchPayload);
          
          if (searchResponse.data && searchResponse.data.search_info) {
            console.log("Informations de recherche reçues pour Qwen:", searchResponse.data.search_info);
            const searchInfo = searchResponse.data.search_info;
            
            // Mise à jour du message partiel pour indiquer les progrès
            setPartialResponse("Informations trouvées, génération de la réponse en cours...");
            
            // Enrichir le contexte avec les informations de recherche
            const searchContext = `Voici des informations récentes du web sur "${userMessage}":\n\n`;
            const sources = searchInfo.results || [];
            
            let contextSources = "";
            sources.slice(0, 5).forEach((source, index) => {
              contextSources += `Source ${index + 1}: ${source.title}\n${source.snippet}\n\n`;
            });
            
            // Ajouter explicitement la date actuelle
            const today = new Date();
            const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
            
            // Insérer un message système supplémentaire avec le contexte de recherche et la date
            messages.push({
              role: "system",
              content: `${searchContext}${contextSources}\nAujourd'hui, nous sommes le ${dateStr}. Utilise ces informations récentes pour répondre à la question et cite tes sources. Assure-toi d'utiliser la date d'aujourd'hui (${dateStr}) comme référence et NON les dates qui pourraient être mentionnées dans les sources.`
            });
            
            // Notification d'information
            notifications.show({
              title: 'Recherche web terminée',
              message: `${sources.length} sources trouvées. Génération de la réponse en cours...`,
              color: 'blue',
              icon: <IconSearch size={16} />
            });
            
            // Maintenant faire un appel HTTP direct (sans streaming) pour Qwen
            const startTime = performance.now();
            
            // Utiliser l'approche non-streaming adaptée aux modèles Qwen
            await fallbackToDirectHttpForQwen(messages, startTime, {
              ...newUserMessage,
              searchInfo: searchInfo // Passer les infos de recherche
            });
            
          } else {
            console.error("Format de réponse inattendu pour la recherche:", searchResponse.data);
            throw new Error("Format de réponse de recherche inattendu");
          }
        } catch (error) {
          console.error("Erreur lors de la recherche web pour Qwen:", error);
          handleApiError(error);
          // Réinitialiser les indicateurs visuels
          setIsStreaming(false);
          setPartialResponse("");
          // Fallback sans recherche web
          await generateResponse(userMessage, null, true);
        }
        
        setIsLoading(false);
        setIsSendingMessage(false);
        return;
      }
      
      // Pour les autres cas (non-Qwen ou sans TurboSearch)
      // Sélection de l'endpoint et des paramètres selon le mode
      let endpoint = '/api/chat';
      let queryParams = '';
      
      if (useWebSearch) {
        endpoint = '/api/chat-with-search';
        queryParams = `?search_query=${encodeURIComponent(userMessage)}`;
        console.log("Envoi de la requête avec TurboSearch à", endpoint);
      } else if (useRag && ragCollection) {
        console.log(`RAG activé avec collection: ${ragCollection}, envoi de message RAG`);
        await generateRagResponse(newUserMessage);
        return;
      }
      
      try {
        console.log(`Envoi de la requête à ${endpoint}${queryParams}`);
        
        // Appel de l'API avec streaming
        const response = await axios.post(`${endpoint}${queryParams}`, payload);
        console.log("Réponse reçue:", response.data);
        
        if (response.data.status === "streaming" && response.data.session_id) {
          const sessionId = response.data.session_id;
          console.log("Session ID obtenu:", sessionId);
          
          // Ouvrir un événement source pour recevoir le flux de réponse
          await processStreamResponse(sessionId, response.data.search_info);
        } else if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
          // Si nous avons une réponse directe du modèle non-streaming
          const content = response.data.choices[0].message.content;
          
          // Si la recherche web a été utilisée, fusionner le contenu avec les sources
          const finalContent = integrateSearchSourcesIntoContent(
            content, 
            response.data.search_info
          );
          
          addMessage({
            role: 'assistant',
            content: finalContent,
            timestamp: new Date().toISOString(),
            search_info: response.data.search_info,
            useTurboSearch: useWebSearch
          });
        } else {
          console.error("Format de réponse inattendu:", response.data);
          handleApiError(new Error("Format de réponse inattendu"));
        }
      } catch (error) {
        console.error("Erreur lors de la requête:", error);
        const errorMessage = error.response?.data?.detail || error.message;
        
        if (useWebSearch) {
          notifications.show({
            title: 'Erreur Turbo Search',
            message: `Impossible d'effectuer la recherche web: ${errorMessage}`,
            color: 'red',
          });
          
          // Réessayer sans TurboSearch
          setUseWebSearch(false);
          notifications.show({
            title: 'Essai sans Turbo Search',
            message: 'Génération de réponse sans utiliser la recherche web...',
            color: 'blue',
          });
        }
        
        // Fallback au mode standard
        await generateResponse(userMessage, null, true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      handleApiError(error);
    } finally {
      setIsLoading(false);
      setIsSendingMessage(false); // Réinitialiser l'état d'envoi
    }
  };

  // Fonction d'utilitaire pour intégrer les sources de recherche dans le contenu
  const integrateSearchSourcesIntoContent = (content, searchInfo) => {
    // Validation des entrées
    if (!searchInfo) {
      console.warn("Missing search info in TurboSearch integration");
      return content || "";
    }
    
    if (!content) {
      content = "";
    }
    
    console.log("Integrating search sources into content:", {
      contentLength: content.length,
      searchInfo: searchInfo
    });
    
    // Vérifier que searchInfo a la structure attendue
    if (!searchInfo.results || !Array.isArray(searchInfo.results) || searchInfo.results.length === 0) {
      console.warn("Search results missing or empty in searchInfo");
      return content + "\n\n*Recherche effectuée, mais aucun résultat pertinent trouvé.*";
    }
    
    // Obtenir la date actuelle au format français
    const today = new Date();
    const currentDate = today.toLocaleDateString('fr-FR', {
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
    
    // Créer le contenu final
    let finalContent = content;
    
    // Ajouter un espacement et un badge TurboSearch
    finalContent += "\n\n---\n\n";
    finalContent += `**Sources consultées via TurboSearch (${currentDate}):**\n\n`;
    
    try {
      // Ajouter les sources principales (max 3)
      const mainSources = searchInfo.results.slice(0, Math.min(3, searchInfo.results.length));
      mainSources.forEach((source, index) => {
        try {
          const hostname = source.link ? new URL(source.link).hostname.replace('www.', '') : "source";
          finalContent += `${index + 1}. **${source.title || "Source sans titre"}** - [${hostname}](${source.link || "#"})\n`;
        } catch (error) {
          console.warn("Error formatting search source:", error, source);
          finalContent += `${index + 1}. **${source.title || "Source"}** - [Lien](${source.link || "#"})\n`;
        }
      });
      
      // Informations sur le nombre total de sources
      if (searchInfo.results.length > 3) {
        finalContent += `\n*${searchInfo.results.length - 3} sources supplémentaires ont également été consultées.*`;
      }
      
      // Ajouter des informations sur le temps d'analyse
      const elapsedTime = typeof searchInfo.elapsed_time === 'number' ? searchInfo.elapsed_time.toFixed(2) : '?';
      finalContent += `\n\n*Recherche effectuée le ${currentDate} en ${elapsedTime} secondes.*`;
    } catch (error) {
      console.error("Error integrating search sources:", error);
      finalContent += "\n\n*Une erreur s'est produite lors de l'intégration des sources de recherche.*";
    }
    
    return finalContent;
  };

  // Nouvelle fonction pour générer une réponse spécifique RAG
  const generateRagResponse = async (userMessage) => {
    if (!userMessage.content.trim()) return;
    
    setIsLoading(true);
    setIsStreaming(false);
    setStreamedText('');
    
    try {
      console.log(`Génération de réponse RAG avec collection: ${userMessage.ragCollection}`);
      
      // Préparer les messages pour l'API RAG
      // On exclut le message système car le backend l'ajoutera
      const messages = currentConversation.messages
        .filter(msg => !msg.deleted && msg.role !== 'system')
        .map(msg => ({ role: msg.role, content: msg.content }));
      
      // Préparer la requête pour l'API RAG
      const payload = {
        query: userMessage.content,
        collection_name: userMessage.ragCollection,
        top_k: 3,
        messages: messages,
        max_tokens: parameters.max_tokens,
        temperature: parameters.temperature,
        top_p: parameters.top_p,
        frequency_penalty: parameters.frequency_penalty,
        presence_penalty: parameters.presence_penalty,
        use_stream: true,
      };
      
      // Si le modèle est Qwen, utiliser une approche non-streaming
      const isQwenModel = modelType === 'openrouter' && currentModel && 
                           (currentModel.toLowerCase().includes('qwen') || 
                            currentModel.toLowerCase().includes('qwen3'));
      
      if (isQwenModel) {
        payload.use_stream = false;
        
        // Notification pour informer l'utilisateur
        notifications.show({
          title: 'Modèle Qwen détecté',
          message: 'Les modèles Qwen sont puissants mais ne supportent pas le streaming avec RAG. Merci pour votre patience pendant la génération...',
          color: 'orange',
          icon: <IconInfoCircle size={16} />,
          autoClose: 5000
        });
        
        console.log("Utilisation du mode non-streaming pour Qwen avec RAG");
        
        // Appel direct à l'API
        const response = await axios.post('/api/rag/chat', payload);
        console.log("Réponse RAG non-streaming reçue:", response.data);
        
        if (response.data && response.data.model_response) {
          const data = response.data;
          
          // Extraire la réponse du modèle
          const modelResponse = data.model_response;
          let content = "";
          
          // Vérifier si la réponse a le format attendu
          if (modelResponse.choices && modelResponse.choices[0] && modelResponse.choices[0].message) {
            content = modelResponse.choices[0].message.content || "";
          }
          
          // Vérifier si le contenu est valide
          if (content && content.trim().length > 0) {
            // Ajouter le message à la conversation avec les informations RAG
            addMessage({
              role: 'assistant',
              content: content,
              timestamp: new Date().toISOString(),
              useRag: true,
              ragCollection: userMessage.ragCollection,
              ragSources: data.rag_info?.sources || []
            });
          } else {
            // Si le contenu est vide, mais que nous avons quand même des sources RAG
            if (data.rag_info && data.rag_info.sources && data.rag_info.sources.length > 0) {
              console.log("Réponse du modèle vide, mais sources RAG disponibles:", data.rag_info.sources);
              
              // Message de secours
              const fallbackContent = "Je n'ai pas pu générer une réponse basée sur les documents fournis. " +
                "Cependant, voici les sources pertinentes qui pourraient vous aider à répondre à votre question.";
              
              // Ajouter un message avec le contenu de secours et les sources RAG
              addMessage({
                role: 'assistant',
                content: fallbackContent,
                timestamp: new Date().toISOString(),
                useRag: true,
                ragCollection: userMessage.ragCollection,
                ragSources: data.rag_info.sources,
                isFallback: true
              });
            } else {
              console.error("Format de réponse inattendu et pas de sources RAG:", data);
              handleApiError(new Error("Format de réponse RAG inattendu ou vide"));
            }
          }
        } else {
          console.error("Format de réponse inattendu:", response.data);
          handleApiError(new Error("Format de réponse RAG inattendu"));
        }
      } else {
        // Pour les autres modèles, utiliser le streaming
        const response = await axios.post('/api/rag/chat', payload);
        
        if (response.data && response.data.status === "streaming" && response.data.session_id) {
          const sessionId = response.data.session_id;
          console.log("Session RAG ID obtenu:", sessionId);
          
          // Préparer les informations RAG pour le processus de streaming
          const ragInfo = {
            isRag: true,
            collection: userMessage.ragCollection,
            query: userMessage.content
          };
          
          // Traiter le streaming de la réponse
          await processStreamResponse(sessionId, null, ragInfo);
        } else {
          console.error("Format de réponse inattendu:", response.data);
          handleApiError(new Error("Format de réponse RAG inattendu"));
        }
      }
    } catch (error) {
      console.error("Erreur lors de la génération de réponse RAG:", error);
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Nouvelle fonction pour traiter le flux de réponse du streaming
  const processStreamResponse = async (sessionId, searchInfo, ragInfo = null) => {
    setIsStreaming(true);
    
    try {
      const apiUrl = '/api/chat-stream';
      const url = new URL(apiUrl, window.location.origin);
      url.searchParams.append('session_id', sessionId);
      
      const eventSource = new EventSource(url);
      let responseText = '';
      let tokenCount = 0;
      let ragSources = [];
      const startTime = performance.now();
      
      // Créer un nouveau contrôleur d'abort pour pouvoir annuler la requête
      const controller = new AbortController();
      setStreamController(controller);
      
      // Gérer les événements du stream
      eventSource.onmessage = (event) => {
        console.log("SSE Event received:", {
          rawData: event.data,
          dataType: typeof event.data,
          dataLength: event.data?.length
        });
        
        try {
          // Check if it's the [DONE] message
          if (event.data === "[DONE]") {
            console.log("Received [DONE] event");
            return;
          }
          
          // Try to parse JSON
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.warn("Failed to parse event data as JSON:", event.data);
            // Handle non-JSON data
            if (event.data.startsWith("data: ")) {
              try {
                // Try to parse the data after "data: " prefix
                data = JSON.parse(event.data.slice(6));
              } catch (nestedError) {
                // If still can't parse, treat as raw data
                data = { type: 'chunk', data: event.data };
              }
            } else {
              // Treat as raw data
              data = { type: 'chunk', data: event.data };
            }
          }
          
          if (data.type === 'chunk') {
            responseText += data.data;
            setStreamedText(responseText);
            
            // Estimation approximative des tokens (4 caractères = 1 token environ)
            tokenCount = Math.round(responseText.length / 4);
            setPartialResponse(responseText);
          } else if (data.type === 'search_info') {
            // Mettre à jour les informations de recherche
            console.log("Information de recherche reçue via stream:", data.search_info);
            searchInfo = data.search_info; // Mettre à jour pour l'utiliser plus tard
          } else if (data.type === 'rag_sources') {
            // Enregistrer les sources RAG quand elles sont reçues
            console.log("Sources RAG reçues via stream:", data.sources);
            ragSources = data.sources || [];
          } else if (data.type === 'end') {
            // Calculer le temps de réponse
            const endTime = performance.now();
            const responseTimeSeconds = (endTime - startTime) / 1000;
            
            // Déterminer si c'est une réponse Turbo Search ou RAG
            const isTurboSearch = searchInfo !== null;
            const isRagResponse = ragInfo !== null || ragSources.length > 0;
            
            console.log("Fin du stream, ajout du message avec flags:", {
              isTurboSearch: isTurboSearch,
              isRagResponse: isRagResponse,
              searchInfo: searchInfo ? "présent" : "absent",
              ragSources: ragSources.length + " sources"
            });
            
            // Vérifier si la réponse est vide alors qu'il s'agit d'une réponse RAG
            const emptyResponse = !data.data || data.data.trim().length === 0;
            let finalContent = data.data;
            let isFallback = false;
            
            if (emptyResponse && isRagResponse && ragSources.length > 0) {
              console.log("Réponse vide pour RAG, utilisation d'un message de secours");
              finalContent = "Je n'ai pas pu générer une réponse basée sur les documents fournis. " +
                            "Cependant, voici les sources pertinentes qui pourraient vous aider à répondre à votre question.";
              isFallback = true;
            }
            
            // Si c'est une réponse TurboSearch, intégrer les sources dans la réponse
            if (isTurboSearch) {
              finalContent = integrateSearchSourcesIntoContent(finalContent, searchInfo);
            }
            
            // Ajouter le message complet à la conversation avec les métriques appropriées
            addMessage({
              role: 'assistant',
              content: finalContent,
              timestamp: new Date().toISOString(),
              search_info: searchInfo,
              metrics: {
                tokens: tokenCount || Math.round(finalContent.length / 4),
                time: responseTimeSeconds,
                interrupted: false
              },
              // Ajouter les propriétés RAG si nécessaire
              useRag: isRagResponse,
              ragCollection: ragInfo?.collection,
              ragSources: ragSources,
              useTurboSearch: isTurboSearch,
              isFallback: isFallback
            });
            
            // Terminer le streaming
            setIsStreaming(false);
            setStreamController(null);
            setStreamedText('');
            setPartialResponse('');
            eventSource.close();
          } else if (data.type === 'error') {
            handleApiError(new Error(data.data));
            setIsStreaming(false);
            setStreamController(null);
            eventSource.close();
          }
        } catch (error) {
          console.error("Error processing stream event:", error, event.data);
          handleApiError(error);
          setIsStreaming(false);
          setStreamController(null);
          eventSource.close();
        }
      };
      
      // Gérer les erreurs
      eventSource.onerror = (error) => {
        console.error("EventSource error:", error);
        handleApiError(new Error("Erreur de connexion au stream"));
        setIsStreaming(false);
        setStreamController(null);
        eventSource.close();
      };
      
      // Configurer un timeout pour fermer la connexion si aucune réponse n'est reçue
      const eventTimeoutId = setTimeout(() => {
        if (responseText.length === 0) {
          console.error("Stream timeout - no response received");
          handleApiError(new Error("Aucune réponse reçue du serveur"));
          setIsStreaming(false);
          setStreamController(null);
          eventSource.close();
        }
      }, 30000); // 30 secondes de timeout
      
      // Configurer le contrôleur pour fermer la connexion si nécessaire
      controller.signal.addEventListener('abort', () => {
        console.log("Aborting stream");
        clearTimeout(eventTimeoutId);
        eventSource.close();
      });
    } catch (error) {
      console.error("Error setting up EventSource:", error);
      handleApiError(error);
      setIsStreaming(false);
      setStreamController(null);
    }
  };

  // Fonction pour traiter les réponses HTTP directes (fallback pour les modèles Qwen)
  const handleDirectHttpResponse = async (response) => {
    try {
      console.log("Traitement d'une réponse HTTP directe");
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur de réponse HTTP:", response.status, errorText);
        handleApiError(new Error(`Erreur ${response.status}: ${errorText}`));
        setIsStreaming(false);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (data.error) {
        console.error("Erreur dans la réponse:", data.error);
        handleApiError(new Error(data.error));
        setIsStreaming(false);
        setIsLoading(false);
        return;
      }

      // Ajouter la réponse complète
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        setPartialResponse(content);
        
        // Ajouter le message à la conversation
        addMessage({
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString()
        });
        
        setIsStreaming(false);
        setIsLoading(false);
      } else {
        console.error("Format de réponse inattendu:", data);
        handleApiError(new Error("Format de réponse inattendu"));
        setIsStreaming(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Erreur lors du traitement de la réponse HTTP:", error);
      handleApiError(error);
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  // Fonction de secours pour les modèles Qwen qui utilisera HTTP direct au lieu de SSE
  const fallbackToDirectHttpForQwen = async (messages, startTime, userMessage) => {
    try {
      console.log(`Utilisation du fallback HTTP direct pour le modèle Qwen: ${currentModel}`);
      
      // Pour gérer le cas RAG avec Qwen, vérifier si le message utilisateur a des propriétés RAG
      const isRagMessage = userMessage.useRag && userMessage.ragCollection;
      
      // Vérifier si nous avons des informations de recherche (TurboSearch)
      const hasSearchInfo = userMessage.searchInfo !== undefined;
      
      // Obtenir la date actuelle au format FR
      const today = new Date();
      const currentDate = today.toLocaleDateString('fr-FR', {
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
      });
      
      let endpoint = '/api/chat';
      let requestData = {
        messages: messages,
        max_tokens: parameters.max_tokens,
        temperature: parameters.temperature,
        top_p: parameters.top_p,
        frequency_penalty: parameters.frequency_penalty,
        presence_penalty: parameters.presence_penalty,
        stream: false
      };
      
      // Ajouter explicitement la date actuelle dans les messages
      if (hasSearchInfo) {
        // Trouver le message système s'il existe
        const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
        
        if (systemMessageIndex >= 0) {
          // Modifier le message système existant pour inclure la date
          messages[systemMessageIndex].content = `${messages[systemMessageIndex].content}\n\nAujourd'hui, nous sommes le ${currentDate}. Utilise cette date comme référence temporelle pour toute information d'actualité.`;
        } else {
          // Ajouter un nouveau message système avec la date
          messages.unshift({
            role: 'system',
            content: `Tu es un assistant IA précis et informatif. Aujourd'hui, nous sommes le ${currentDate}. Utilise cette date comme référence temporelle pour toute information d'actualité.`
          });
        }
        
        // Mettre à jour les messages dans la requête
        requestData.messages = messages;
      }
      
      // Si c'est un message RAG, utiliser l'endpoint RAG
      if (isRagMessage) {
        console.log(`Message RAG détecté pour Qwen, utilisation de l'endpoint RAG avec collection: ${userMessage.ragCollection}`);
        endpoint = '/api/rag/chat';
        requestData = {
          query: userMessage.content,
          collection_name: userMessage.ragCollection,
          top_k: 3,
          messages: messages.filter(msg => msg.role !== 'system'), // Exclure le message système car il sera ajouté par le backend
          max_tokens: parameters.max_tokens,
          temperature: parameters.temperature,
          top_p: parameters.top_p,
          frequency_penalty: parameters.frequency_penalty,
          presence_penalty: parameters.presence_penalty,
          use_stream: false
        };
      }
      
      // Notification pour informer l'utilisateur
      notifications.show({
        title: 'Modèle Qwen détecté',
        message: hasSearchInfo 
          ? 'Analyse des résultats de recherche web en cours...' 
          : 'Les modèles Qwen sont puissants mais ne supportent pas le streaming. Merci pour votre patience pendant la génération...',
        color: 'orange',
        icon: <IconInfoCircle size={16} />,
        autoClose: 5000
      });
      
      // Indicateur visuel de chargement
      setIsStreaming(true);
      if (hasSearchInfo) {
        setPartialResponse("Analyse des résultats de recherche en cours...");
      } else {
        setPartialResponse("Génération de la réponse avec le modèle Qwen en cours...");
      }
      
      console.log(`Envoi de la requête pour le modèle Qwen à l'endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log(`Réponse reçue pour Qwen, statut: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API (${response.status}): ${errorText}`);
      }
      
      const responseData = await response.json();
        
      // Traiter différemment les réponses RAG et non-RAG
      if (isRagMessage && responseData.rag_info) {
        console.log("Traitement de la réponse RAG pour Qwen");
        
        // Vérifier si la requête correspond bien à celle envoyée
        if (responseData.query && responseData.query !== userMessage.content) {
          console.warn(`Désynchronisation détectée: requête envoyée "${userMessage.content}", requête retournée "${responseData.query}"`);
        
          // Notification pour l'utilisateur
          notifications.show({
            title: 'Attention',
            message: 'Possible désynchronisation entre questions et réponses détectée.',
            color: 'orange',
          });
        }
        
        // Extraire la réponse du modèle si disponible
        if (responseData.model_response && responseData.model_response.choices && 
            responseData.model_response.choices[0] && responseData.model_response.choices[0].message) {
          
          const content = responseData.model_response.choices[0].message.content;
        
          // Estimation des tokens (approximative)
          const inputTokens = responseData.model_response.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
          const outputTokens = responseData.model_response.usage?.completion_tokens || Math.round(content.length / 4);
          const totalTokens = responseData.model_response.usage?.total_tokens || (inputTokens + outputTokens);
          
          // Calculer le temps de réponse
          const responseTime = (performance.now() - startTime) / 1000;
          
          // Créer le message assistant avec les informations RAG
          const assistantMessage = {
            role: 'assistant',
            content: content,
            metrics: {
              tokens: outputTokens,
              total_tokens: totalTokens,
              input_tokens: inputTokens,
              time: responseTime
            },
            timestamp: new Date(),
            useRag: true,
            ragCollection: responseData.rag_info.collection,
            ragSources: responseData.rag_info.sources || []
          };
        
          // Ajouter à la conversation
          addMessage(assistantMessage);
          
          // Mettre à jour les métriques
          setResponseTime(responseTime);
          setTokenMetrics({
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          });
          
          return;
        } 
        else {
          console.error("Format de réponse RAG invalide:", responseData);
          throw new Error("Format de réponse RAG invalide");
        }
      } 
      else {
        // Traitement pour une réponse normale ou TurboSearch
        if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
          const content = responseData.choices[0].message.content;
          
          // Estimation des tokens (approximative ou utilisation des valeurs retournées)
          const inputTokens = responseData.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
          const outputTokens = responseData.usage?.completion_tokens || Math.round(content.length / 4);
          const totalTokens = responseData.usage?.total_tokens || (inputTokens + outputTokens);
          
          // Calculer le temps de réponse
          const responseTime = (performance.now() - startTime) / 1000;
          
          // Créer le contenu final en intégrant les sources si nécessaire
          let finalContent = content;
          if (hasSearchInfo) {
            finalContent = integrateSearchSourcesIntoContent(content, userMessage.searchInfo);
          }
          
          // Ajouter le message à la conversation
          addMessage({
            role: 'assistant',
            content: finalContent,
            timestamp: new Date().toISOString(),
            search_info: hasSearchInfo ? userMessage.searchInfo : undefined,
            useTurboSearch: hasSearchInfo,
            metrics: {
              tokens: outputTokens,
              total_tokens: totalTokens,
              input_tokens: inputTokens,
              time: responseTime
            }
          });
          
          // Mettre à jour les métriques pour l'affichage
          setResponseTime(responseTime);
          setTokenMetrics({
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          });
          
          console.log(`Réponse complète reçue en ${responseTime.toFixed(2)} secondes, tokens: ${totalTokens}`);
        } else {
          console.error("Format de réponse inattendu:", responseData);
          throw new Error("Format de réponse inattendu");
        }
      }
      
      // Assurez-vous que les indicateurs de chargement sont désactivés
      setIsLoading(false);
      setIsStreaming(false);
      setPartialResponse('');
      
    } catch (error) {
      console.error("Erreur lors de l'utilisation du fallback HTTP:", error);
      handleApiError(error);
      setIsStreaming(false);
      setIsLoading(false);
      setPartialResponse('');
    }
  };

  // Fonction principale pour générer une réponse via l'API
  const generateResponse = async (userMessage, messageContext = null, messageAlreadyAdded = false) => {
    if (!userMessage || (typeof userMessage === 'string' && !userMessage.trim())) return;
    
    const startTime = new Date();
    setIsLoading(true);
    setIsStreaming(false);
    setStreamedText('');
    
    let messages = [];
    
    if (messageContext) {
      // Si un contexte spécifique est fourni (pour régénérer ou éditer)
      messages = messageContext;
    } else if (messageAlreadyAdded) {
      // Si le message a déjà été ajouté à la conversation, juste construire le contexte
      messages = prepareConversationMessages(typeof userMessage === 'string' ? {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      } : userMessage);
    } else {
      // Créer un nouveau message et l'ajouter à la conversation
      const newUserMessage = {
        role: 'user',
        content: typeof userMessage === 'string' ? userMessage : userMessage.content,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter le message à la conversation
      addMessageToConversation(newUserMessage);
      
      // Construire le contexte complet de la conversation
      messages = prepareConversationMessages(newUserMessage);
      
      // Réinitialiser le champ de texte
      setInput('');
    }
    
    try {
      // Vérifier si nous utilisons un modèle Qwen via OpenRouter
      const isQwenModel = modelType === 'openrouter' && currentModel && 
                          (currentModel.toLowerCase().includes('qwen') || 
                           currentModel.toLowerCase().includes('qwen3'));
      
      if (isQwenModel) {
        console.log(`Modèle Qwen détecté: ${currentModel}, utilisation du mode non-streaming`);
        await fallbackToDirectHttpForQwen(messages, startTime, userMessage);
        return;
      }
      
      // Pour les autres modèles, utiliser le streaming avec EventSource
      await generateStreamingResponse(userMessage, messages);
      
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse:', error);
      handleApiError(error);
      setIsLoading(false);
    }
  };

  // Fonction pour générer une réponse via streaming
  const generateStreamingResponse = async (userMessage, messages) => {
    try {
      // Mettre à jour l'état de l'interface pour afficher clairement le chargement
      setIsStreaming(true);
      setIsLoading(true); // S'assurer que isLoading est également actif
      
      // Afficher le message "génération en cours" dans la zone de réponse partielle
      setPartialResponse("Génération de la réponse en cours...");
      
      // Ajouter une notification visuelle pour améliorer l'UX
      notifications.show({
        title: 'Génération en cours',
        message: 'Veuillez patienter pendant la génération de la réponse',
        color: 'blue',
        loading: true,
        autoClose: false,
        id: 'generation-notification'
      });
      
      const payload = {
        messages,
        max_tokens: parameters.max_tokens,
        temperature: parameters.temperature,
        top_p: parameters.top_p,
        frequency_penalty: parameters.frequency_penalty,
        presence_penalty: parameters.presence_penalty,
        stream: true
      };
      
      console.log("Envoi de la requête avec streaming...");
      
      // Lancer la requête de streaming
      const response = await axios.post('/api/chat', payload);
      
      if (response.data.status === "streaming" && response.data.session_id) {
        const sessionId = response.data.session_id;
        console.log("Session ID obtenu:", sessionId);
        
        // Ouvrir un événement source pour recevoir le flux de réponse
        await processStreamResponse(sessionId, null);
        
        // Fermer la notification une fois terminé
        notifications.hide('generation-notification');
      } else {
        console.error("Format de réponse inattendu:", response.data);
        handleApiError(new Error("Format de réponse inattendu"));
        
        // Fermer la notification en cas d'erreur
        notifications.hide('generation-notification');
      }
    } catch (error) {
      console.error("Erreur lors de la requête streaming:", error);
      
      if (error.response?.status === 413) {
        handleApiError(new Error("La requête est trop volumineuse. Essayez de raccourcir votre message ou de créer une nouvelle conversation."));
      } else {
        handleApiError(error);
      }
      
      // Réinitialiser tous les états et fermer la notification
      setIsStreaming(false);
      setIsLoading(false);
      setPartialResponse("");
      notifications.hide('generation-notification');
    }
  };

  // Fonction pour déterminer le type de modèle
  const getModelTypeFromName = (modelName) => {
    if (!modelName) return 'unknown';
    
    const modelLower = modelName.toLowerCase();
    
    // Modèles locaux
    if (modelType === 'local') return 'local';
    
    // OpenRouter models
    if (modelType === 'openrouter') {
      if (modelName.includes('qwen')) return 'qwen';
      if (modelName.includes('gemini')) return 'gemini';
      if (modelName.includes('llama')) return 'llama';
      if (modelName.includes('claude')) return 'claude';
      if (modelName.includes('mistral')) return 'mistral';
      if (modelName.includes('deepseek')) return 'deepseek';
      return 'openrouter';
    }
    
    // Autres APIs
    if (modelType === 'gemini') return 'gemini';
    if (modelType === 'groq') return 'groq';
    if (modelType === 'openai') {
      if (modelLower.includes('gpt-4')) return 'gpt4';
      if (modelLower.includes('gpt-3.5')) return 'gpt35';
      return 'openai';
    }
    
    return 'unknown';
  };

  // Fonction pour obtenir le badge du modèle actuel
  const getModelBadge = () => {
    const modelTypeValue = getModelTypeFromName(currentModel);
    
    let label = currentModel || 'Modèle inconnu';
    let color = 'gray';
    
    // Si un type de modèle est défini (qu'il soit local ou API)
    if (modelType) {
      // Pour les modèles API
      if (modelType !== 'local') {
        // Pour OpenRouter, extraire le nom après le "/"
        if (currentModel && currentModel.includes('/')) {
          const parts = currentModel.split('/');
          label = parts[parts.length - 1].replace(':free', '');
        }
        
        // Couleurs spécifiques par type de modèle
        switch (modelType) {
          case 'openai':
            color = 'green';
            label = `OpenAI: ${label}`;
            break;
          case 'gemini':
            color = 'violet';
            label = `Gemini: ${label}`;
            break;
          case 'groq':
            color = 'teal';
            label = `Groq: ${label}`;
            break;
          case 'openrouter':
            if (modelTypeValue === 'gemini') {
              color = 'violet';
              label = `OpenRouter: ${label}`;
            } else if (modelTypeValue === 'qwen') {
              color = 'orange';
              label = `OpenRouter: ${label}`;
            } else if (modelTypeValue === 'llama') {
              color = 'pink'; 
              label = `OpenRouter: ${label}`;
            } else if (modelTypeValue === 'claude') {
              color = 'lime';
              label = `OpenRouter: ${label}`;
            } else if (modelTypeValue === 'mistral') {
              color = 'cyan';
              label = `OpenRouter: ${label}`;
            } else {
              color = 'orange';
              label = `OpenRouter: ${label}`;
            }
            break;
          default:
            color = 'blue';
        }
        
        return { label, color };
      }
      
      // Pour les modèles locaux
      if (modelType === 'local') {
        if (currentModel) {
          color = 'blue';
          label = `Local: ${currentModel}`;
        } else {
          color = 'red';
          label = 'Modèle non chargé';
        }
      }
    } else {
      // Si aucun type de modèle n'est défini
      color = 'red';
      label = 'API non configurée';
    }
    
    return { label, color };
  };

  // Badge du modèle actuel
  const modelBadge = getModelBadge();

  // Gestion des erreurs API
  const handleApiError = (error) => {
    console.error('API Error:', error);
    setErrorMessage(error.message || 'Une erreur est survenue lors de la communication avec l\'API');
      
      notifications.show({
      title: 'Erreur de génération',
      message: error.message || 'Une erreur est survenue lors de la génération de la réponse',
        color: 'red',
      icon: <IconX size={16} />,
      });
    
    setIsLoading(false);
    setIsStreaming(false);
  };

  // Gestion de l'appui sur Entrée pour envoyer le message
  const handleKeyDown = (e) => {
    // Enter without shift to send, Ctrl+Enter to add new line
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      if (!isLoading && !isStreaming && input.trim() && !isSendingMessage) {
      handleSendMessage();
    }
    }
    
    // Ctrl+Shift+F to trigger search
    if (e.key === 'f' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      if (!model_info?.serpapi_key) {
        notifications.show({
          title: 'Configuration requise',
          message: 'Veuillez configurer une clé API SerpAPI dans les paramètres pour utiliser Turbo Search',
          color: 'yellow',
        });
        navigate('/settings');
        return;
      }
      if (input.trim()) {
        setUseWebSearch(true);
      }
    }
  };

  // Création d'une nouvelle conversation
  const clearChat = () => {
    createConversation();
    setInput('');
    setStreamedText('');
    setErrorMessage(null);
  };
  
  // Gestion de la sauvegarde de conversation
  const saveConversation = () => {
    if (!currentConversation.messages.length) return;
    
    if (currentConversation.title) {
      // Si la conversation a déjà un titre, sauvegarder directement
      notifications.show({
        title: 'Conversation sauvegardée',
        message: 'La conversation a été sauvegardée avec succès',
        color: 'green',
      });
    } else {
      // Sinon, demander un titre
      setTitleDialogOpen(true);
      // Générer un titre suggéré basé sur le premier message
      if (currentConversation.messages.length > 0) {
        const firstUserMsg = currentConversation.messages.find(m => m.role === 'user');
        if (firstUserMsg) {
          setNewTitle(firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : ''));
        }
      }
    }
  };
  
  // Confirmation de sauvegarde avec titre
  const confirmSaveConversation = () => {
    if (newTitle.trim()) {
      updateConversationTitle(newTitle.trim());
      setTitleDialogOpen(false);
      
      notifications.show({
        title: 'Conversation sauvegardée',
        message: 'La conversation a été sauvegardée avec succès',
        color: 'green',
      });
    }
  };
  
  // Export de la conversation actuelle
  const exportCurrentChat = () => {
    if (!currentConversation.messages.length) return;
    
    const title = currentConversation.title || 'conversation';
    exportConversation(currentConversation.id, title);
  };
  
  // Gestion de l'édition d'un message
  const handleEditMessage = (index, content) => {
    setEditingMessage({ index, content });
    setEditModalOpen(true);
  };
  
  // Sauvegarde d'un message édité
  const saveEditedMessage = () => {
    if (editingMessage.content.trim() && editingMessage.index >= 0) {
      // Mettre à jour le message
      updateMessage(editingMessage.index, editingMessage.content);
      
      // Si régénération activée et message utilisateur, régénérer les réponses
      if (regenerateAfterEdit) {
        const messages = currentConversation.messages;
        const updatedMsg = { ...messages[editingMessage.index], content: editingMessage.content };
        
        if (updatedMsg.role === 'user') {
          // Trouver les messages suivants à régénérer
          const messagesToRegenerate = [];
          
          // On part du message suivant celui qui a été édité
          let i = editingMessage.index + 1;
          
          // Si le message suivant est une réponse de l'assistant, on le régénère
          if (i < messages.length && messages[i].role === 'assistant') {
            // Préparer le contexte de la conversation jusqu'au message édité
            const context = messages
              .slice(0, i)
              .filter(msg => !msg.deleted)
              .map(msg => ({ 
                role: msg.role, 
                content: msg === messages[editingMessage.index] ? editingMessage.content : msg.content 
              }));
              
            // Régénérer la réponse
            setTimeout(() => {
              regenerateResponse(i, context);
            }, 500);
          }
        }
      }
      
      setEditModalOpen(false);
    }
  };
  
  // Suppression d'un message
  const handleDeleteMessage = (index) => {
    deleteMessage(index);
  };
  
  // Régénération d'une réponse
  const handleRegenerateResponse = (index) => {
    // Trouver le message utilisateur précédent
    const messages = currentConversation.messages;
    let userMsgIndex = index - 1;
    
    // Si le message à l'index n'est pas une réponse de l'assistant, ne rien faire
    if (messages[index].role !== 'assistant') return;
    
    // Chercher le dernier message utilisateur avant cette réponse
    while (userMsgIndex >= 0) {
      if (messages[userMsgIndex].role === 'user' && !messages[userMsgIndex].deleted) {
        break;
      }
      userMsgIndex--;
    }
    
    if (userMsgIndex >= 0) {
      // Préparer le contexte pour la régénération
      const context = messages
        .slice(0, index)
        .filter(msg => !msg.deleted)
        .map(msg => ({ role: msg.role, content: msg.content }));
      
      // Régénérer la réponse
      regenerateResponse(index, context);
    }
  };
  
  // Fonction pour préparer les messages de la conversation pour l'API
  const prepareConversationMessages = (userMessage) => {
    // Appliquer le ton choisi au message
    const tonePrompt = getTonePrompt();
    const messageWithTone = tonePrompt ? 
      { ...userMessage, content: tonePrompt + userMessage.content } : 
      userMessage;
      
    // Utiliser tous les messages de la conversation actuelle
    const messages = currentConversation.messages
      .filter(msg => !msg.deleted)
      .map(msg => ({ role: msg.role, content: msg.content }));
      
    // Ajouter le message actuel s'il n'est pas déjà dans le contexte
    if (!messages.some(msg => 
      msg.content === messageWithTone.content && 
      msg.role === messageWithTone.role)
    ) {
      messages.push({ 
        role: messageWithTone.role, 
        content: messageWithTone.content 
      });
    }
    
    return messages;
  };
  
  // Fonction pour ajouter un message à la conversation
  const addMessageToConversation = (message) => {
    addMessage(message);
  };

  // Fonction pour afficher les sources RAG d'un message
  const handleShowRagSources = (index) => {
    const message = currentConversation.messages[index];
    if (message.ragSources) {
      setCurrentRagSources(message.ragSources);
      setCurrentRagMessage(message);
      setRagSourcesModalOpen(true);
    }
  };

  // Function to handle search result selection
  const handleSearchResultSelect = (result) => {
    // Cette fonction n'est plus utilisée avec l'ancienne interface, mais conservée pour compatibilité
    console.log("Sélection de résultat de recherche:", result);
    
    // Étant donné que le panneau TurboSearch n'est plus affiché, cette fonction ne fait plus rien
    // Les résultats sont maintenant intégrés directement dans la réponse
  };

  // Function to search directly from input
  const searchFromInput = () => {
    if (input.trim()) {
      setUseWebSearch(true);
    }
  };

  // Ajouter à l'état pour gérer l'affichage des sources Turbo Search
  const [currentSearchInfo, setCurrentSearchInfo] = useState(null);
  const [currentSearchMessage, setCurrentSearchMessage] = useState(null);
  const [searchSourcesModalOpen, setSearchSourcesModalOpen] = useState(false);

  // Fonction pour afficher les sources Turbo Search d'un message
  const handleShowSearchSources = (index) => {
    const message = currentConversation.messages[index];
    if (message.search_info) {
      setCurrentSearchInfo(message.search_info);
      setCurrentSearchMessage(message);
      setSearchSourcesModalOpen(true);
    }
  };

  return (
    <>
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier le message"
        size="lg"
      >
        <Textarea
          value={editingMessage.content}
          onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
          minRows={5}
          maxRows={10}
          mb="md"
        />
        <Stack spacing="xs">
          <Switch
            label="Régénérer les réponses après modification"
            checked={regenerateAfterEdit}
            onChange={(e) => setRegenerateAfterEdit(e.currentTarget.checked)}
            mb="sm"
          />
          <Text size="xs" color="dimmed">
            Si activé, les réponses suivant ce message seront régénérées pour refléter votre modification.
          </Text>
        </Stack>
        <Group position="right" mt="md">
          <Button variant="outline" onClick={() => setEditModalOpen(false)}>Annuler</Button>
          <Button onClick={saveEditedMessage}>Sauvegarder</Button>
        </Group>
      </Modal>
      
      <Modal
        opened={titleDialogOpen}
        onClose={() => setTitleDialogOpen(false)}
        title="Sauvegarder la conversation"
        size="md"
      >
        <TextInput
          label="Titre de la conversation"
          placeholder="Entrez un titre descriptif"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          mb="md"
        />
        <Group position="right">
          <Button variant="outline" onClick={() => setTitleDialogOpen(false)}>Annuler</Button>
          <Button onClick={confirmSaveConversation}>Sauvegarder</Button>
        </Group>
      </Modal>
    
      <Modal
        opened={ragSourcesModalOpen}
        onClose={() => setRagSourcesModalOpen(false)}
        title={
          <Group>
            <IconDatabase size={16} />
            <Text>Sources RAG</Text>
          </Group>
        }
        size="lg"
      >
        {currentRagMessage && (
          <>
            <Paper p="xs" withBorder mb="md">
              <Text size="sm" fw={500}>Question</Text>
              <Text size="sm" mt="xs">{currentRagMessage.content}</Text>
            </Paper>
            
            {currentRagSources && currentRagSources.length > 0 ? (
              <>
                <Text size="sm" mb="xs" fw={500}>
                  {currentRagSources.length} source{currentRagSources.length > 1 ? 's' : ''} trouvée{currentRagSources.length > 1 ? 's' : ''}
                </Text>
                <Accordion>
                  {currentRagSources.map((source, i) => (
                    <Accordion.Item key={i} value={`source-${i}`}>
                      <Accordion.Control>
        <Group position="apart">
                          <Group>
                            <Text size="sm" fw={500}>
                              {source.metadata?.filename || `Source ${i+1}`}
                            </Text>
                            {source.metadata?.source && (
                              <Badge size="sm" variant="outline">
                                {source.metadata.source.split('/').pop()}
            </Badge>
          )}
        </Group>
                          <Badge size="sm" color="blue">Score: {(source.metadata?.score || 0).toFixed(2)}</Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack spacing="xs">
                          <Paper withBorder p="xs" bg="gray.0">
                            <Text size="sm">{source.content}</Text>
                          </Paper>
                          <Group position="right" spacing="xs">
                            {source.metadata?.source && (
                              <Button 
                                variant="subtle" 
                                size="xs" 
                                leftSection={<IconExternalLink size={14} />}
                                onClick={() => {
                                  // Utiliser l'URL complète de l'API avec le chemin encodé
                                  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
                                  const documentPath = encodeURIComponent(source.metadata.source);
                                  window.open(`${apiUrl}/api/documents/${documentPath}`, '_blank');
                                }}
                              >
                                Voir document
                              </Button>
                            )}
                            {source.metadata?.page_number && (
                              <Badge size="sm" color="gray">Page {source.metadata.page_number}</Badge>
                            )}
                            {source.metadata?.chunk_id && (
                              <Badge size="sm" color="gray">Chunk {source.metadata.chunk_id}</Badge>
                            )}
                          </Group>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
                <Group position="right" mt="md">
                  <Button 
                    size="xs" 
                    variant="outline" 
                    leftSection={<IconInfoCircle size={14} />}
                    onClick={() => {
                      // Utiliser la navigation au lieu d'ouvrir dans une nouvelle fenêtre
                      navigate('/rag-documentation');
                      setRagSourcesModalOpen(false); // Fermer la modal
                    }}
                  >
                    Documentation RAG
                  </Button>
                </Group>
              </>
            ) : (
              <Text c="dimmed">Aucune source disponible</Text>
            )}
          </>
        )}
      </Modal>
    
      <Modal
        opened={searchSourcesModalOpen}
        onClose={() => setSearchSourcesModalOpen(false)}
        title={
          <Group>
            <IconSearch size={16} />
            <Text>Sources Turbo Search</Text>
          </Group>
        }
        size="lg"
      >
        {currentSearchMessage && currentSearchInfo && (
          <>
            <Paper p="xs" withBorder mb="md">
              <Text size="sm" fw={500}>Recherche</Text>
              <Text size="sm" mt="xs">{currentSearchInfo.query}</Text>
            </Paper>
            
            {currentSearchInfo.results && currentSearchInfo.results.length > 0 ? (
              <>
                <Text size="sm" mb="xs" fw={500}>
                  {currentSearchInfo.results.length} source{currentSearchInfo.results.length > 1 ? 's' : ''} trouvée{currentSearchInfo.results.length > 1 ? 's' : ''}
                </Text>
                <Accordion>
                  {currentSearchInfo.results.map((result, i) => (
                    <Accordion.Item key={i} value={`source-${i}`}>
                      <Accordion.Control>
                        <Group position="apart">
                          <Group>
                            <Text size="sm" fw={500}>
                              {result.title || `Source ${i+1}`}
                            </Text>
                          </Group>
                          <Badge size="sm" color="blue">Position: {result.position || i+1}</Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack spacing="xs">
                          <Paper withBorder p="xs" bg="gray.0">
                            <Text size="sm">{result.snippet}</Text>
                          </Paper>
                          <Group position="right" spacing="xs">
                            <Anchor href={result.link} target="_blank" size="xs">
                              <Group spacing={4}>
                                <Text>Consulter la source</Text>
                                <IconExternalLink size={14} />
                              </Group>
                            </Anchor>
                          </Group>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </>
            ) : (
              <Text c="dimmed">Aucune source disponible</Text>
            )}
          </>
        )}
      </Modal>
    
      <MotionPaper 
        shadow="sm" 
        p="sm"
        mb="sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Group position="apart" mb="xs" align="center">
          <Group spacing="xs" align="center">
            <Title order={4} style={{ marginRight: 8 }}>
              {currentConversation.title || 'Nouvelle conversation'}
            </Title>
            
            {(modelType === 'api') ? (
              <MotionBadge 
                size="md"
                color="violet" 
                variant="filled"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                whileHover={{ scale: 1.05 }}
              >
                API TurboChat
              </MotionBadge>
            ) : currentModel ? (
              <MotionBadge 
                size="md"
                color={modelStatus.color} 
                variant="filled"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                whileHover={{ scale: 1.05 }}
              >
                {modelStatus.label}
              </MotionBadge>
            ) : null}
          </Group>
          
          <Group spacing="xs" position="right">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button compact variant="filled" color="blue" onClick={clearChat} leftSection={<IconPlus size={14} />}>
                Nouveau
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button compact variant="outline" color="blue" onClick={saveConversation} 
                disabled={!currentConversation.messages.length} leftSection={<IconCheck size={14} />}>
                Sauvegarder
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button compact variant="outline" color="teal" onClick={exportCurrentChat} 
                leftSection={<IconDownload size={14} />} disabled={!currentConversation.messages.length}>
                Export
              </Button>
            </motion.div>
            
          <Grid align="end" gutter="xs" mb="xs">
            <Grid.Col span={3}>
              <Text size="xs" fw={500} mb={2}>Température</Text>
          <Select
                placeholder="Temp."
            value={parameters.temperature.toString()}
            onChange={(value) => updateParameters({ temperature: parseFloat(value) })}
            data={[
                  { value: '0.3', label: '0.3 - Précis' },
              { value: '0.5', label: '0.5 - Équilibré' },
              { value: '0.7', label: '0.7 - Recommandé' },
                  { value: '0.9', label: '0.9 - Créatif' },
            ]}
                size="xs"
                style={{ width: '100%' }}
          />
            </Grid.Col>
            <Grid.Col span={3}>
              <Text size="xs" fw={500} mb={2}>Ton</Text>
          <Select
                placeholder="Ton"
            value={parameters.tone}
            onChange={(value) => updateParameters({ tone: value })}
            data={[
              { value: 'default', label: 'Standard' },
              { value: 'teacher', label: 'Professeur' },
              { value: 'simple', label: 'Simplifié' },
              { value: 'detailed', label: 'Détaillé' },
            ]}
                size="xs"
                style={{ width: '100%' }}
          />
            </Grid.Col>
            <Grid.Col span="auto">
        <Group>
                {ragCollections.length > 0 && (
                  <Popover width={300} position="bottom" withArrow shadow="md">
                    <Popover.Target>
          <Button
                        size="xs" 
                        variant={useRag ? "filled" : "outline"} 
                        color={useRag ? "green" : "gray"}
                        leftIcon={<IconDatabase size={16} />}
          >
                        RAG
          </Button>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Stack>
                        <Switch 
                          label="Activer la recherche documentaire" 
                          checked={useRag} 
                          onChange={(e) => setUseRag(e.currentTarget.checked)}
                        />
                        <Select
                          label="Collection"
                          description="Base de connaissances à utiliser"
                          data={ragCollections.map(col => ({ value: col.name, label: col.name }))}
                          value={ragCollection}
                          onChange={setRagCollection}
                          disabled={!useRag}
                        />
                        <Text size="xs" c="dimmed">
                          La recherche documentaire vous permet d'enrichir les réponses du modèle avec des informations issues de vos documents.
                        </Text>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                )}
                <Tooltip label={showAdvanced ? "Masquer les paramètres avancés" : "Afficher les paramètres avancés"}>
                  <ActionIcon size="md" variant="light" color="blue" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <IconSettings size={16} />
                  </ActionIcon>
            </Tooltip>
        </Group>
            </Grid.Col>
          </Grid>
        </Group>
        </Group>
        
        <Collapse in={showAdvanced}>
          <Paper withBorder p="xs" shadow="xs" mb="xs">
            <Grid>
              <Grid.Col span={3}>
                <NumberInput
                  label="Max Tokens"
                  value={parameters.max_tokens}
                  onChange={(value) => updateParameters({ max_tokens: value })}
                  min={100}
                  max={4000}
                  step={100}
                  size="xs"
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput
                  label="Top P"
                  value={parameters.top_p}
                  onChange={(value) => updateParameters({ top_p: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  precision={1}
                  size="xs"
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput
                  label="Fréquence"
                  value={parameters.frequency_penalty}
                  onChange={(value) => updateParameters({ frequency_penalty: value })}
                  min={0}
                  max={2}
                  step={0.1}
                  precision={1}
                  size="xs"
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput
                  label="Présence"
                  value={parameters.presence_penalty}
                  onChange={(value) => updateParameters({ presence_penalty: value })}
                  min={0}
                  max={2}
                  step={0.1}
                  precision={1}
                  size="xs"
                />
              </Grid.Col>
            </Grid>
      </Paper>
        </Collapse>
      </MotionPaper>
      
      <MotionPaper
        shadow="sm" 
        style={{ 
          position: 'relative', 
          height: 'calc(100vh - 150px)',
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          background: theme.colors.gray[0]
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <ScrollArea 
          viewportRef={viewport} 
          style={{ flex: 1 }} 
          p="md"
          offsetScrollbars
          scrollbarSize={4}
        >
          {!isInitialized ? (
            <Box style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader size="md" />
            </Box>
          ) : currentConversation.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
            <Box 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '1.5rem'
              }}
            >
                <MotionAvatar 
                  size="lg"
                  radius="xl" 
                  color="blue"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
            >
                  <IconRobot size={24} />
                </MotionAvatar>
              <Title order={4} mt="md" mb="xs">Bienvenue sur TurboChat</Title>
                <Text c="dimmed" maw={600} mx="auto" size="sm">
                  Je suis votre assistant IA conçu pour vous aider dans vos tâches quotidiennes. 
                  Posez-moi n'importe quelle question et je ferai de mon mieux pour vous fournir 
                  une réponse claire et précise.
              </Text>
                
                <MotionCard 
                  withBorder 
                  p="sm"
                  radius="md" 
                  mt="md"
                  shadow="sm" 
                  maw={700}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  whileHover={{ boxShadow: theme.shadows.md }}
                >
                  <Title order={5} mb="xs">
                    <IconBrush size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Suggestions de questions
                  </Title>
                  <Grid gutter="xs">
                    {[
                      "Explique-moi le théorème de Pythagore et donne un exemple d'application.",
                      "Quelles sont les principales causes de la Première Guerre mondiale ?",
                      "Comment fonctionne la photosynthèse chez les plantes ?",
                      "Rédige un email professionnel pour demander un délai supplémentaire.",
                      "Donne-moi une recette facile de cookies au chocolat.",
                      "Quels sont les meilleurs exercices pour améliorer ma concentration ?"
                    ].map((question, index) => (
                      <Grid.Col span={6} key={index}>
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                          whileHover={{ scale: 1.02, backgroundColor: theme.colors.blue[0] }}
                          whileTap={{ scale: 0.98 }}
                          style={{ 
                            borderRadius: theme.radius.md,
                            overflow: 'hidden',
                            height: '100%'
                          }}
                        >
                          <Button 
                            variant="subtle" 
                            onClick={() => setInput(question)}
                            fullWidth
                            p="xs"
                            styles={{
                              root: {
                                height: '100%',
                                textAlign: 'left',
                                paddingTop: 8,
                                paddingBottom: 8
                              }
                            }}
                            size="sm"
                          >
                            {question}
                          </Button>
                        </motion.div>
                      </Grid.Col>
                    ))}
                  </Grid>
                </MotionCard>
                
                <MotionCard 
                  withBorder 
                  p="sm"
                  radius="md" 
                  mt="md"
                  shadow="sm" 
                  maw={700}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Title order={5} mb="xs">
                    <IconRobot size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Ce que je peux faire pour vous
                  </Title>
                  <Grid gutter="xs">
                    <Grid.Col span={4}>
                      <Card p="xs" radius="md" withBorder>
                        <Group mb="xs" spacing="xs">
                          <IconMessageChatbot size={16} color={theme.colors.blue[5]} />
                          <Text fw={600} size="sm">Rédaction</Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Emails, résumés, articles, explications pédagogiques
                        </Text>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Card p="xs" radius="md" withBorder>
                        <Group mb="xs" spacing="xs">
                          <IconZoomQuestion size={16} color={theme.colors.green[5]} />
                          <Text fw={600} size="sm">Analyse</Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Recherche d'information, synthèse, comparaisons
                        </Text>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Card p="xs" radius="md" withBorder>
                        <Group mb="xs" spacing="xs">
                          <IconTemperature size={16} color={theme.colors.orange[5]} />
                          <Text fw={600} size="sm">Créativité</Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Idées, histoires, concepts, brainstorming
              </Text>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </MotionCard>
            </Box>
            </motion.div>
          ) : (
            <>
              {currentConversation.messages
                .filter(msg => !msg.deleted)
                .map((message, index) => (
                  <Message 
                    key={index} 
                    role={message.role} 
                    content={message.content} 
                    metrics={message.metrics}
                    timestamp={message.timestamp}
                    edited={message.edited}
                    editTimestamp={message.editTimestamp}
                    regenerated={message.regenerated}
                    regenerateTimestamp={message.regenerateTimestamp}
                    useRag={message.useRag}
                    ragCollection={message.ragCollection}
                    useTurboSearch={message.useTurboSearch}
                    search_info={message.search_info}
                    index={index}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onRegenerate={handleRegenerateResponse}
                    onShowRagSources={handleShowRagSources}
                    onShowSearchSources={handleShowSearchSources}
                    isNew={newMessages.includes(index)}
                  />
              ))}
              
              {isLoading && (
                <MotionPaper 
                  p="sm" 
                  radius="md" 
                  withBorder
                  mb="md"
                  style={{ 
                    borderLeft: `3px solid ${theme.colors.blue[5]}`,
                    maxWidth: '92%',
                    marginLeft: '0',
                    marginRight: 'auto',
                    borderRadius: '16px 16px 16px 0'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Group gap="sm" align="flex-start">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2
                      }}
                    >
                      <Avatar size="sm" color="cyan" radius="xl">
                        <IconRobot size={16} />
                      </Avatar>
                    </motion.div>
                    
                    <Box style={{ flex: 1 }}>
                      <Text fw={500} size="xs" mb={4}>
                        Assistant
                      </Text>
                      <Group spacing={8}>
                        <Loader size="xs" />
                        <Text size="xs" c="dimmed">
                          Génération de la réponse en cours...
                        </Text>
                      </Group>
                    </Box>
                  </Group>
                </MotionPaper>
              )}
            </>
          )}
          
          {/* Show partial response while streaming */}
          {isStreaming && partialResponse && (
            <MotionPaper 
              shadow="sm"
              p="xs"
              mb="sm"
              radius="md"
              style={{ 
                backgroundColor: 'white',
                borderLeft: `3px solid ${theme.colors.blue[5]}`,
                marginLeft: '0',
                marginRight: 'auto',
                maxWidth: '94%',
                width: 'auto',
                borderRadius: '16px 16px 16px 0',
                opacity: 0.9
              }}
              initial={{ opacity: 0.5, y: 10 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Group gap="xs" align="flex-start">
                <Avatar size="xs" color="cyan" radius="xl">
                  <IconRobot size={12} />
                </Avatar>
                
                <div style={{ flex: 1 }}>
                  <Group position="apart" align="center" spacing="xs" mb={1}>
                    <Group spacing="xs" align="center">
                      <Text fw={500} size="xs">Assistant</Text>
                      <Text component="span" c="dimmed" size="xs" style={{ fontSize: '10px' }}>
                        En cours...
                      </Text>
                      {useWebSearch && (
                        <Badge 
                          size="xs" 
                          variant="filled" 
                          color="blue"
                          styles={{ root: { fontSize: '9px', height: 16, padding: '0 4px' } }}
                        >
                          Turbo Search
                        </Badge>
                      )}
                      <Loader size="xs" color="blue" />
                    </Group>
                  </Group>
                  
                  <div className="markdown-content">
                    <ReactMarkdown>
                      {partialResponse}
                    </ReactMarkdown>
                  </div>
                </div>
              </Group>
            </MotionPaper>
          )}
        </ScrollArea>

        <Paper 
          p="xs"
          style={{ 
            borderTop: '1px solid ' + theme.colors.gray[3],
            backgroundColor: 'white'
          }}
        >
          <form 
            onSubmit={(e) => { 
              e.preventDefault();
              e.stopPropagation();
              if (!isLoading && !isStreaming && input.trim() && !isSendingMessage) {
                handleSendMessage();
              }
            }}
          >
            {isStreaming ? (
              <Group position="center">
                <Button 
                  color="red" 
                  leftSection={<IconMaximize size={16} />}
                  onClick={stopResponseGeneration}
                  size="sm"
                  variant="light"
                >
                  Interrompre la génération
                </Button>
              </Group>
            ) : (
              <>
                <Group align="flex-start" style={{ maxWidth: '100%', margin: '0 auto' }} position="apart">
              <Textarea
                placeholder="Posez votre question ici..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autosize
                minRows={1}
                maxRows={5}
                    disabled={isLoading || isStreaming || isSendingMessage}
                style={{ flex: 1 }}
                    ref={textareaRef}
              />
                  <Group spacing="xs" align="center" mt={4}>
                    {/* TurboSearch Toggle */}
                    <Tooltip label="Turbo Search">
                      <ActionIcon 
                        variant={useWebSearch ? "filled" : "subtle"}
                        color={useWebSearch ? "blue" : "gray"}
                        onClick={() => {
                          // Vérifier si la clé SerpAPI est configurée
                          if (!model_info?.serpapi_key && !useWebSearch) {
                            notifications.show({
                              title: 'Configuration requise',
                              message: 'Veuillez configurer une clé API SerpAPI dans les paramètres pour utiliser Turbo Search',
                              color: 'yellow',
                            });
                            navigate('/settings');
                            return;
                          }
                          setUseWebSearch(!useWebSearch);
                        }}
                        disabled={isLoading || isStreaming || isSendingMessage}
                        size="md"
                      >
                        <IconSearch size={18} />
                      </ActionIcon>
                    </Tooltip>
                    
                    {/* RAG Toggle */}
                    {ragCollections.length > 0 && (
                      <Tooltip label="Recherche documentaire (RAG)">
                        <Popover width={300} position="top-end" withArrow shadow="md">
                          <Popover.Target>
                            <ActionIcon 
                              variant={useRag ? "filled" : "subtle"}
                              color={useRag ? "green" : "gray"}
                              size="md"
                              disabled={isLoading || isStreaming || isSendingMessage}
                            >
                              <IconDatabase size={18} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack>
                              <Switch 
                                label="Activer la recherche documentaire" 
                                checked={useRag} 
                                onChange={(e) => setUseRag(e.currentTarget.checked)}
                                disabled={isLoading || isStreaming || isSendingMessage}
                              />
                              <Select
                                label="Collection"
                                description="Base de connaissances à utiliser"
                                data={ragCollections.map(col => ({ value: col.name, label: col.name }))}
                                value={ragCollection}
                                onChange={setRagCollection}
                                disabled={!useRag || isLoading || isStreaming || isSendingMessage}
                              />
                              <Text size="xs" c="dimmed">
                                La recherche documentaire vous permet d'enrichir les réponses du modèle avec des informations issues de vos documents.
                              </Text>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Tooltip>
                    )}
                    
                    {/* Send Button */}
                    <Tooltip label="Envoyer">
                      <ActionIcon 
                        color="blue" 
                        variant="filled" 
                type="submit" 
                        disabled={isLoading || isStreaming || !input.trim() || isSendingMessage}
                        size="md"
              >
                        <IconSend size={18} />
                      </ActionIcon>
                    </Tooltip>
            </Group>
                </Group>
                
                {/* Status indicators for TurboSearch and RAG */}
                <Group spacing={8} mt={4} mb={4}>
                  {useWebSearch && (
                    <Badge 
                      size="sm" 
                      color="blue" 
                      leftSection={<IconSearch size={12} />}
                      variant="light"
                    >
                      Turbo Search activé
                    </Badge>
                  )}
                  
                  {useRag && ragCollection && (
                    <Badge 
                      size="sm" 
                      color="green" 
                      leftSection={<IconDatabase size={12} />}
                      variant="light"
                    >
                      RAG: {ragCollection}
                    </Badge>
                  )}
                </Group>
              </>
            )}
          </form>
          
          {/* Suppression du TurboSearchPanel ici */}
          
          {/* Disclaimer et conformité CE */}
          <Divider my="xs" />
          <Group position="center" spacing="xs" style={{ opacity: 0.7 }}>
            <Text size="xs" color="dimmed">
              Les réponses sont générées par intelligence artificielle et peuvent nécessiter vérification.
            </Text>
            <Tooltip label="Conforme aux normes européennes en matière d'IA">
              <Badge size="xs" variant="outline" radius="sm" color="gray">
                <Group spacing={4}>
                  <Box component="span" style={{ fontWeight: 'bold' }}>CE</Box>
                  <Box component="span">IA responsable</Box>
                </Group>
              </Badge>
            </Tooltip>
          </Group>
        </Paper>
      </MotionPaper>
    </>
  );
};

export default Chat; 