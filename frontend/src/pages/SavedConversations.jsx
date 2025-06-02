import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Title, 
  Paper, 
  Text, 
  Group, 
  Button, 
  Stack,
  Card,
  ActionIcon,
  Badge,
  Divider,
  Alert,
  Box
} from '@mantine/core';
import { 
  IconTrash, 
  IconExternalLink, 
  IconMessage, 
  IconCheck,
  IconAlertCircle 
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const SavedConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Charger les conversations sauvegardées depuis le localStorage
    const loadConversations = () => {
      try {
        const saved = localStorage.getItem('saved_conversations');
        if (saved) {
          const parsedConversations = JSON.parse(saved);
          setConversations(parsedConversations);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger les conversations sauvegardées',
          color: 'red'
        });
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  const handleOpenConversation = (conversationId) => {
    // Charger la conversation et naviguer vers la page de chat
    try {
      const conversationData = conversations.find(c => c.id === conversationId);
      if (conversationData) {
        localStorage.setItem('current_conversation', JSON.stringify(conversationData));
        navigate('/chat');
        notifications.show({
          title: 'Conversation chargée',
          message: `"${conversationData.title}" a été chargé avec succès`,
          color: 'green'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la conversation:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'ouvrir cette conversation',
        color: 'red'
      });
    }
  };

  const handleDeleteConversation = (conversationId) => {
    try {
      const updatedConversations = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedConversations);
      localStorage.setItem('saved_conversations', JSON.stringify(updatedConversations));
      
      notifications.show({
        title: 'Conversation supprimée',
        message: 'La conversation a été supprimée avec succès',
        color: 'green'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la conversation:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de supprimer cette conversation',
        color: 'red'
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return 'Date invalide';
    }
  };

  const getMessageCount = (conversation) => {
    return conversation?.messages?.length || 0;
  };

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Conversations sauvegardées</Title>
      
      {loading ? (
        <Text>Chargement des conversations...</Text>
      ) : conversations.length === 0 ? (
        <Alert icon={<IconAlertCircle size={16} />} title="Aucune conversation" color="blue" mb="xl">
          Vous n'avez pas encore sauvegardé de conversations. 
          Pour sauvegarder une conversation, cliquez sur le bouton "Sauver" dans l'interface de chat.
        </Alert>
      ) : (
        <Stack spacing="md">
          {conversations.map((conversation) => (
            <Card key={conversation.id} shadow="sm" p="lg" radius="md" withBorder>
              <Group position="apart" mb="xs">
                <Text weight={500} size="lg">{conversation.title || 'Conversation sans titre'}</Text>
                <Badge color="blue">{getMessageCount(conversation)} messages</Badge>
              </Group>
              
              <Text size="sm" color="dimmed" mb="md">
                Sauvegardé le {formatDate(conversation.timestamp)}
              </Text>
              
              {conversation.messages && conversation.messages.length > 0 && (
                <Box mb="md">
                  <Text size="sm" weight={500}>Premier message:</Text>
                  <Paper p="xs" withBorder>
                    <Text size="sm" lineClamp={2}>
                      {conversation.messages[0].content}
                    </Text>
                  </Paper>
                </Box>
              )}
              
              <Divider my="sm" />
              
              <Group position="right">
                <Button 
                  variant="subtle" 
                  color="gray" 
                  leftIcon={<IconTrash size={14} />} 
                  onClick={() => handleDeleteConversation(conversation.id)}
                >
                  Supprimer
                </Button>
                <Button 
                  color="blue" 
                  leftIcon={<IconExternalLink size={14} />}
                  onClick={() => handleOpenConversation(conversation.id)}
                >
                  Ouvrir
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default SavedConversations; 