import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';

const LOCAL_STORAGE_KEY = 'turbochat_conversations';
const CURRENT_CONVERSATION_KEY = 'turbochat_current_conversation_id';
const MAX_SAVED_CONVERSATIONS = 100;

const ConversationContext = createContext();

export const useConversation = () => useContext(ConversationContext);

export const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState({
    id: null,
    messages: [],
    title: 'Nouvelle conversation',
    date: new Date(),
    lastUpdated: new Date(),
    autoSaved: false,
    modelInfo: {}
  });
  const [isAutoSaving, setIsAutoSaving] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger les conversations depuis le localStorage au démarrage
  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem(LOCAL_STORAGE_KEY);
      
    if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        
        // Vérifier que parsed est un tableau
        if (!Array.isArray(parsed)) {
          console.warn('Format incorrect de conversations sauvegardées, réinitialisation...');
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setConversations([]);
          setIsInitialized(true);
          return;
        }
        
        // Convertir les dates en objets Date
        const conversationsWithDates = parsed.map(conv => ({
          ...conv,
          date: new Date(conv.date || Date.now()),
          lastUpdated: conv.lastUpdated ? new Date(conv.lastUpdated) : new Date(conv.date || Date.now()),
          // S'assurer que messages est un tableau valide
          messages: Array.isArray(conv.messages) ? conv.messages : [],
          // S'assurer que chaque conversation a un ID
          id: conv.id || Date.now().toString() + Math.random().toString(36).substring(2, 9)
        }));
        
        // Trier par dernière mise à jour
        const sorted = conversationsWithDates.sort((a, b) => 
          new Date(b.lastUpdated || b.date) - new Date(a.lastUpdated || a.date)
        );
        
        // Limiter le nombre de conversations sauvegardées
        const limited = sorted.slice(0, MAX_SAVED_CONVERSATIONS);
        
        setConversations(limited);
        
        // Charger la dernière conversation active si disponible
        const lastActiveId = localStorage.getItem('lastActiveConversation');
        if (lastActiveId) {
          const lastActive = limited.find(conv => conv.id === lastActiveId);
          if (lastActive) {
            setCurrentConversationId(lastActive.id);
            setCurrentConversation(lastActive);
          }
        }
      }
      } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
      // En cas d'erreur, réinitialiser l'état
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setConversations([]);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sauvegarder les conversations dans le localStorage avec debounce
  useEffect(() => {
    // Ne pas sauvegarder si on n'a pas encore initialisé
    if (!isInitialized) return;
    
    try {
      const timer = setTimeout(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(conversations));
        
        // Sauvegarder l'ID de la conversation active
        if (currentConversationId) {
          localStorage.setItem('lastActiveConversation', currentConversationId);
        }
      }, 500); // Debounce de 500ms
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des conversations:', error);
      notifications.show({
        title: 'Erreur de sauvegarde',
        message: 'Impossible de sauvegarder vos conversations',
        color: 'red'
      });
    }
  }, [conversations, currentConversationId, isInitialized]);

  // Sauvegarde immédiate de la conversation active
  const saveImmediately = useCallback(() => {
    if (!isInitialized || !currentConversation) return;
    
    try {
      // Mettre à jour la conversation dans la liste
      if (currentConversationId) {
        const updatedConversations = conversations.map(conv => 
          conv.id === currentConversationId ? {...currentConversation, lastUpdated: new Date()} : conv
        );
        setConversations(updatedConversations);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedConversations));
        localStorage.setItem('lastActiveConversation', currentConversationId);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde immédiate:', error);
    }
  }, [conversations, currentConversation, currentConversationId, isInitialized]);

  // Auto-sauvegarde de la conversation courante
  useEffect(() => {
    if (!isInitialized || !isAutoSaving || !currentConversation?.id || currentConversation.autoSaved) {
      return;
    }
    
    // Ne sauvegarder que si la conversation a des messages
    if (currentConversation.messages.length === 0) {
      return;
    }
    
    const updatedConversation = {
      ...currentConversation,
      lastUpdated: new Date(),
      autoSaved: true
    };
    
    setCurrentConversation(updatedConversation);
    
    // Mettre à jour dans la liste des conversations
    const conversationIndex = conversations.findIndex(conv => conv.id === currentConversation.id);
    if (conversationIndex >= 0) {
      const newConversations = [...conversations];
      newConversations[conversationIndex] = updatedConversation;
      setConversations(newConversations);
    } else {
      // Si la conversation n'est pas encore dans la liste, l'ajouter
      setConversations([updatedConversation, ...conversations]);
    }
  }, [currentConversation?.messages, isAutoSaving, currentConversation, conversations, isInitialized]);

  // Générer un titre basé sur le contenu
  const generateTitle = useCallback((content) => {
    if (!content || typeof content !== 'string') {
      return 'Nouvelle conversation';
    }
    
    // Supprimer les sauts de ligne et les espaces supplémentaires
    const cleanContent = content.trim().replace(/\s+/g, ' ');
    
    // Si le contenu est très court, l'utiliser tel quel
    if (cleanContent.length <= 50) {
      return cleanContent;
    }
    
    // Rechercher la première phrase (se terminant par ., !, ou ?)
    const sentenceMatch = cleanContent.match(/^(.+?[.!?])\s/);
    if (sentenceMatch && sentenceMatch[1].length <= 70) {
      return sentenceMatch[1];
    }
    
    // Si la première phrase est trop longue ou introuvable, prendre les premiers mots
    const firstWords = cleanContent.substring(0, 50).split(' ');
    // Retirer le dernier mot qui pourrait être coupé
    firstWords.pop();
    return firstWords.join(' ') + '...';
  }, []);

  // Créer une nouvelle conversation
  const createConversation = useCallback(() => {
    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newConversation = {
      id: newId,
      title: 'Nouvelle conversation',
      date: new Date(),
      lastUpdated: new Date(),
      messages: [],
      modelInfo: {},
      autoSaved: false
    };
    
    // Ajouter au début de la liste
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newId);
    setCurrentConversation(newConversation);
    
    return newConversation;
  }, []);

  // Mettre à jour le titre d'une conversation
  const updateConversationTitle = useCallback((id, title) => {
    if (!title.trim()) return;
    
    const updatedConversations = conversations.map(conv => 
      conv.id === id ? { 
        ...conv, 
        title,
        lastUpdated: new Date(),
        autoSaved: true
      } : conv
    );
    
    setConversations(updatedConversations);
    
    if (currentConversationId === id) {
      setCurrentConversation(prev => ({ 
        ...prev, 
        title,
        lastUpdated: new Date(),
        autoSaved: true
      }));
    }
    
    // Sauvegarder immédiatement
    setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedConversations));
    }, 0);
  }, [conversations, currentConversationId]);

  // Ajouter un message à la conversation courante
  const addMessage = useCallback((message) => {
    if (!message || !message.role || !message.content) {
      console.warn('Tentative d\'ajout d\'un message invalide');
      return;
    }
    
    // S'assurer que le message a un timestamp
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date()
    };
    
    // Si aucune conversation active, en créer une nouvelle
    if (!currentConversationId || !currentConversation.id) {
      const newConv = createConversation();
      const updatedConversation = { 
        ...newConv, 
        messages: [messageWithTimestamp],
        lastUpdated: new Date(),
        autoSaved: false
      };
      
      // Mettre à jour automatiquement le titre si c'est le premier message de l'utilisateur
      if (message.role === 'user') {
        updatedConversation.title = generateTitle(message.content);
      }
      
      setCurrentConversation(updatedConversation);
      
      // Mettre à jour la liste des conversations
      setConversations(prev => {
        const newList = prev.map(conv => 
        conv.id === newConv.id ? updatedConversation : conv
        );
        return newList;
      });
      
      return;
    }
    
    // Sinon, ajouter à la conversation existante
    setCurrentConversation(prev => {
      const updatedConversation = { 
        ...prev, 
        messages: [...prev.messages, messageWithTimestamp],
        lastUpdated: new Date(),
        autoSaved: false
      };
      
      // Mettre à jour la liste des conversations
      setConversations(convs => 
        convs.map(conv => 
      conv.id === currentConversationId ? updatedConversation : conv
        )
      );
      
      return updatedConversation;
    });
    
    // Mettre à jour automatiquement le titre si c'est le premier message de l'utilisateur
    if (message.role === 'user' && currentConversation.messages.length === 0) {
      const title = generateTitle(message.content);
      updateConversationTitle(currentConversationId, title);
    }
    
    // Forcer la sauvegarde
    setTimeout(saveImmediately, 200);
  }, [currentConversationId, currentConversation, createConversation, generateTitle, updateConversationTitle, saveImmediately]);
  
  // Mettre à jour un message existant
  const updateMessage = useCallback((index, updates) => {
    if (!currentConversation || !currentConversation.messages || 
        index < 0 || index >= currentConversation.messages.length) {
      return;
    }
    
    setCurrentConversation(prev => {
      // Créer une copie des messages et mettre à jour le message spécifié
      const updatedMessages = [...prev.messages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        ...updates,
        edited: true,
        editTimestamp: new Date()
      };
      
      // Créer la conversation mise à jour
      const updatedConversation = {
        ...prev,
        messages: updatedMessages,
        lastUpdated: new Date(),
        autoSaved: false
      };
      
      // Mettre à jour dans la liste des conversations
      setConversations(convs => 
        convs.map(conv => 
          conv.id === currentConversationId ? updatedConversation : conv
        )
      );
      
      return updatedConversation;
    });
    
    // Si le message modifié est le premier message utilisateur, mettre à jour le titre
    if (index === 0 && currentConversation.messages[0].role === 'user' && updates.content) {
      const title = generateTitle(updates.content);
      updateConversationTitle(currentConversationId, title);
    }
    
    // Forcer la sauvegarde
    setTimeout(saveImmediately, 200);
  }, [currentConversation, currentConversationId, generateTitle, updateConversationTitle, saveImmediately]);
  
  // Marquer un message comme supprimé (soft delete)
  const deleteMessage = useCallback((index) => {
    if (!currentConversation || !currentConversation.messages || 
        index < 0 || index >= currentConversation.messages.length) {
      return;
    }
    
    setCurrentConversation(prev => {
      // Marquer le message comme supprimé au lieu de le supprimer réellement
      const updatedMessages = [...prev.messages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        deleted: true,
        deleteTimestamp: new Date()
      };
      
      // Mettre à jour la conversation
      const updatedConversation = {
        ...prev,
        messages: updatedMessages,
        lastUpdated: new Date(),
        autoSaved: false
      };
      
      // Mettre à jour dans la liste des conversations
      setConversations(convs => 
        convs.map(conv => 
          conv.id === currentConversationId ? updatedConversation : conv
        )
      );
      
      return updatedConversation;
    });
    
    // Forcer la sauvegarde
    setTimeout(saveImmediately, 200);
  }, [currentConversation, currentConversationId, saveImmediately]);
  
  // Récupérer un message supprimé
  const recoverMessage = useCallback((index) => {
    if (!currentConversation || !currentConversation.messages || 
        index < 0 || index >= currentConversation.messages.length || 
        !currentConversation.messages[index].deleted) {
      return;
    }
    
    setCurrentConversation(prev => {
      // Récupérer le message supprimé
      const updatedMessages = [...prev.messages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        deleted: false,
        recovered: true,
        recoverTimestamp: new Date()
      };
      
      // Mettre à jour la conversation
      const updatedConversation = {
        ...prev,
        messages: updatedMessages,
        lastUpdated: new Date(),
        autoSaved: false
      };
      
      // Mettre à jour dans la liste des conversations
      setConversations(convs => 
        convs.map(conv => 
          conv.id === currentConversationId ? updatedConversation : conv
        )
      );
      
      return updatedConversation;
    });
    
    // Forcer la sauvegarde
    setTimeout(saveImmediately, 200);
  }, [currentConversation, currentConversationId, saveImmediately]);
  
  // Regénérer une réponse
  const regenerateResponse = useCallback((index, updates) => {
    if (!currentConversation || !currentConversation.messages || 
        index < 0 || index >= currentConversation.messages.length) {
      return;
    }
    
    // Vérifier si le message est bien de l'assistant
    if (currentConversation.messages[index].role !== 'assistant') {
      return;
    }
    
    // Mettre à jour le message
    updateMessage(index, {
      ...updates,
      regenerated: true,
      regenerateTimestamp: new Date()
    });
  }, [currentConversation, updateMessage]);

  // Charger une conversation existante
  const loadConversation = useCallback((id) => {
    const conversation = conversations.find(conv => conv.id === id);
    
    if (!conversation) {
      console.warn(`Conversation avec ID ${id} non trouvée`);
      return null;
    }
    
    // Mettre à jour la dernière date d'accès
    const updatedConversation = {
      ...conversation,
      lastAccessed: new Date()
    };
    
    setCurrentConversationId(id);
    setCurrentConversation(updatedConversation);
    
    // Mettre à jour dans la liste des conversations
    setConversations(convs => 
      convs.map(conv => 
        conv.id === id ? updatedConversation : conv
      )
    );
    
    // Sauvegarder l'ID de la conversation active
    localStorage.setItem('lastActiveConversation', id);
    
    return updatedConversation;
  }, [conversations]);

  // Supprimer une conversation
  const deleteConversation = useCallback((id) => {
    // Supprimer de la liste des conversations
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    // Si c'était la conversation active, réinitialiser
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setCurrentConversation({ 
        id: null,
        messages: [], 
        title: 'Nouvelle conversation',
        date: new Date(),
        lastUpdated: new Date(),
        autoSaved: false
      });
      localStorage.removeItem('lastActiveConversation');
    }
  }, [currentConversationId]);

  // Dupliquer une conversation
  const duplicateConversation = useCallback((id) => {
    const conversation = conversations.find(conv => conv.id === id);
    
    if (!conversation) {
      return null;
    }
    
    // Créer une copie avec un nouvel ID
    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const duplicate = {
      ...conversation,
      id: newId,
      title: `${conversation.title} (copie)`,
      date: new Date(),
      lastUpdated: new Date(),
      autoSaved: false
    };
    
    // Ajouter au début de la liste
    setConversations(prev => [duplicate, ...prev]);
    
    return duplicate;
  }, [conversations]);

  // Exporter une conversation au format texte
  const exportConversation = useCallback((id) => {
    const conversation = conversations.find(conv => conv.id === id) || currentConversation;
    
    let exportText = `# ${conversation.title}\n`;
    exportText += `Date: ${new Date(conversation.date).toLocaleString()}\n\n`;
    
    // Ajouter des métadonnées sur les messages
    let totalTokens = 0;
    let userTokens = 0;
    let assistantTokens = 0;
    
    conversation.messages
      .filter(msg => !msg.deleted) // Ne pas exporter les messages supprimés
      .forEach(msg => {
      const role = msg.role === 'user' ? 'Vous' : 'Assistant';
      exportText += `## ${role}\n\n${msg.content}\n\n`;
        
        if (msg.metrics && msg.metrics.tokens) {
          if (msg.role === 'user') {
            userTokens += msg.metrics.tokens;
          } else {
            assistantTokens += msg.metrics.tokens;
          }
          totalTokens += msg.metrics.tokens;
        }
        
        // Ajouter des informations sur l'édition si applicable
        if (msg.edited) {
          exportText += `*(Modifié le ${new Date(msg.editTimestamp).toLocaleString()})*\n\n`;
        }
        
        if (msg.regenerated) {
          exportText += `*(Régénéré le ${new Date(msg.regenerateTimestamp).toLocaleString()})*\n\n`;
        }
      });
    
    // Ajouter des statistiques à la fin
    if (totalTokens > 0) {
      exportText += `\n## Statistiques\n\n`;
      exportText += `- Total des tokens: ${totalTokens}\n`;
      exportText += `- Tokens utilisateur: ${userTokens}\n`;
      exportText += `- Tokens assistant: ${assistantTokens}\n`;
    }
    
    return exportText;
  }, [conversations, currentConversation]);

  // Activer/désactiver l'autosauvegarde
  const toggleAutoSave = useCallback((value) => {
    const newValue = value !== undefined ? value : !isAutoSaving;
    setIsAutoSaving(newValue);
    localStorage.setItem('autoSaveEnabled', JSON.stringify(newValue));
    
    // Si on active l'autosauvegarde, force une sauvegarde immédiate
    if (newValue && currentConversationId) {
      saveImmediately();
    }
  }, [isAutoSaving, currentConversationId, saveImmediately]);

  // Retourner toutes les fonctions et données du contexte
  return (
    <ConversationContext.Provider
      value={{
        conversations,
        currentConversation,
        currentConversationId,
        isAutoSaving,
        isInitialized,
        createConversation,
        addMessage,
        updateMessage,
        deleteMessage,
        recoverMessage,
        regenerateResponse,
        loadConversation,
        deleteConversation,
        duplicateConversation,
        updateConversationTitle,
        exportConversation,
        toggleAutoSave,
        saveImmediately
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}; 