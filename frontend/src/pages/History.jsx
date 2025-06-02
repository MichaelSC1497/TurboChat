import { useState, useEffect } from 'react';
import { 
  Title, 
  Text, 
  Paper, 
  Stack, 
  Card, 
  Group, 
  Button, 
  Badge,
  ActionIcon,
  Modal,
  Tooltip,
  Menu,
  LoadingOverlay,
  TextInput,
  Select,
  Divider,
  ScrollArea,
  Box,
  Grid,
  Accordion,
  Indicator
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconClock, 
  IconTrash, 
  IconMessage, 
  IconDownload, 
  IconDotsVertical, 
  IconEdit, 
  IconSearch,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconEye,
  IconCheck,
  IconArrowRight,
  IconRefresh,
  IconHistory
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useModel } from '../contexts/ModelContext';
import ReactMarkdown from 'react-markdown';

// Composant pour afficher un aperçu du message
const MessagePreview = ({ message, index }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Limiter le contenu à 100 caractères pour l'aperçu
  const previewContent = !expanded && message.content.length > 100 
    ? message.content.substring(0, 100) + '...' 
    : message.content;
  
  return (
    <Card withBorder p="xs" mb="xs" radius="sm">
      <Group position="apart" mb="xs">
        <Badge color={message.role === 'user' ? 'blue' : 'green'}>
          {message.role === 'user' ? 'Vous' : 'Assistant'}
        </Badge>
        {message.metrics && (
          <Badge size="sm" variant="outline">
            {message.metrics.tokens || '?'} tokens
          </Badge>
        )}
      </Group>
      <Text size="sm" lineClamp={expanded ? undefined : 2}>{previewContent}</Text>
      {message.content.length > 100 && (
        <Button 
          variant="subtle" 
          size="xs" 
          compact 
          onClick={() => setExpanded(!expanded)}
          mt="xs"
        >
          {expanded ? 'Réduire' : 'Voir plus'}
        </Button>
      )}
    </Card>
  );
};

// Composant pour une carte de conversation
const ConversationCard = ({ conversation, onView, onDelete, onExport, onEdit }) => {
  const [showMessages, setShowMessages] = useState(false);
  
  // Calculer la date relative
  const getRelativeTime = (date) => {
    const now = new Date();
    const conversationDate = new Date(date);
    const diffTime = Math.abs(now - conversationDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} jour${diffDays > 1 ? 's' : ''} ${diffHours % 24} heure${(diffHours % 24) > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} heure${diffHours > 1 ? 's' : ''} ${diffMinutes % 60} minute${(diffMinutes % 60) > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  const formattedDate = new Date(conversation.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const relativeTime = getRelativeTime(conversation.lastUpdated || conversation.date);
  
  // Calculer les statistiques de la conversation
  const messageCount = conversation.messages.filter(m => !m.deleted).length;
  const userMessages = conversation.messages.filter(m => m.role === 'user' && !m.deleted).length;
  const assistantMessages = conversation.messages.filter(m => m.role === 'assistant' && !m.deleted).length;
  
  // Estimer le nombre total de tokens si disponible
  let totalTokens = 0;
  let userTokens = 0;
  let assistantTokens = 0;
  
  conversation.messages.forEach(msg => {
    if (msg.deleted) return;
    if (msg.metrics && msg.metrics.tokens) {
      if (msg.role === 'user') {
        userTokens += msg.metrics.tokens;
      } else {
        assistantTokens += msg.metrics.tokens;
      }
      totalTokens += msg.metrics.tokens;
    }
  });

  return (
    <Card shadow="sm" p="md" radius="md" withBorder mb="md">
      <Group position="apart" mb="xs">
        <Group>
        <Text fw={500}>{conversation.title}</Text>
          {conversation.autoSaved && (
            <Indicator position="top-end" color="green" size={8}>
              <Tooltip label="Sauvegardée">
                <IconCheck size={16} color="green" />
              </Tooltip>
            </Indicator>
          )}
        </Group>
        <Group gap={8}>
          <Badge color="blue" variant="light">
            <Group gap={4}>
              <IconMessage size={14} />
              <Text>{messageCount} message{messageCount > 1 ? 's' : ''}</Text>
            </Group>
          </Badge>
          {totalTokens > 0 && (
            <Badge color="yellow" variant="light">
              {totalTokens} tokens
            </Badge>
          )}
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item 
                leftSection={<IconEdit size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(conversation.id);
                }}
              >
                Renommer
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconDownload size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onExport(conversation.id);
                }}
              >
                Exporter
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
              >
                Supprimer
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Text size="sm" c="dimmed" mb="xs">
        <IconClock size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
        {formattedDate} (il y a {relativeTime})
      </Text>

      <Group position="apart" mb="md">
        <Group spacing={8}>
          <Badge color="blue" size="sm" variant="outline">User: {userMessages}</Badge>
          <Badge color="green" size="sm" variant="outline">Assistant: {assistantMessages}</Badge>
        </Group>
        
        {totalTokens > 0 && (
          <Group spacing={8}>
            <Badge color="blue" size="sm" variant="dot">Entrée: {userTokens}</Badge>
            <Badge color="green" size="sm" variant="dot">Sortie: {assistantTokens}</Badge>
          </Group>
        )}
      </Group>

      <Accordion 
        variant="contained"
        mb="md"
        value={showMessages ? 'preview' : null}
        onChange={(value) => setShowMessages(value === 'preview')}
      >
        <Accordion.Item value="preview">
          <Accordion.Control>
            <Group>
              <IconEye size={16} />
              <Text size="sm">Aperçu des messages</Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <ScrollArea h={200} offsetScrollbars>
              {conversation.messages
                .filter(m => !m.deleted)
                .slice(0, 5)
                .map((message, index) => (
                  <MessagePreview key={index} message={message} index={index} />
                ))
              }
              {conversation.messages.filter(m => !m.deleted).length > 5 && (
                <Text ta="center" size="sm" c="dimmed">
                  {conversation.messages.filter(m => !m.deleted).length - 5} message(s) supplémentaire(s)...
                </Text>
              )}
            </ScrollArea>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Group position="right">
        <Button 
          variant="light" 
          onClick={() => onView(conversation.id)}
          leftSection={<IconArrowRight size={16} />}
        >
        Voir la conversation
      </Button>
      </Group>
    </Card>
  );
};

const History = () => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [editingConversation, setEditingConversation] = useState({ id: null, title: '' });
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('lastUpdated');
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    conversations, 
    loadConversation, 
    deleteConversation, 
    exportConversation,
    updateConversationTitle
  } = useConversation();

  // Pour récupérer le type de modèle
  const { modelType } = useModel();

  // Filtrer et trier les conversations
  const filteredConversations = conversations
    .filter(conv => {
      if (!searchQuery) return true;
      const lowercaseQuery = searchQuery.toLowerCase();
      
      // Rechercher dans le titre
      if (conv.title.toLowerCase().includes(lowercaseQuery)) {
        return true;
      }
      
      // Rechercher dans les messages
      return conv.messages.some(msg => 
        msg.content && msg.content.toLowerCase().includes(lowercaseQuery)
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'lastUpdated') {
        const dateA = new Date(a.lastUpdated || a.date);
        const dateB = new Date(b.lastUpdated || b.date);
        return dateB - dateA;
      } else if (sortOrder === 'date') {
    return new Date(b.date) - new Date(a.date);
      } else if (sortOrder === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortOrder === 'messages') {
        return b.messages.filter(m => !m.deleted).length - a.messages.filter(m => !m.deleted).length;
      }
      return 0;
  });

  const handleViewConversation = (id) => {
    setIsLoading(true);
    const loadedConversation = loadConversation(id);
    
    if (loadedConversation) {
    navigate('/');
    notifications.show({
      title: 'Conversation chargée',
      message: 'La conversation a été chargée avec succès',
      color: 'blue',
    });
    } else {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger cette conversation',
        color: 'red',
      });
    }
    
    setIsLoading(false);
  };
  
  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteConversation(deletingId);
      setDeletingId(null);
      closeDeleteModal();
      notifications.show({
        title: 'Conversation supprimée',
        message: 'La conversation a été supprimée avec succès',
        color: 'green',
      });
    }
  };
  
  const handleEditConfirm = () => {
    if (editingConversation.id && editingConversation.title.trim()) {
      updateConversationTitle(editingConversation.id, editingConversation.title);
      closeEditModal();
      notifications.show({
        title: 'Conversation renommée',
        message: 'Le titre de la conversation a été mis à jour',
        color: 'green',
      });
    }
  };
  
  const handleEditConversation = (id) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setEditingConversation({ id, title: conversation.title });
      openEditModal();
    }
  };
  
  const handleExportConversation = (id) => {
    try {
      const conversation = conversations.find(c => c.id === id);
      const text = exportConversation(id);
      
      // Créer un blob et un lien de téléchargement
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conversation.title}-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      
      notifications.show({
        title: 'Succès',
        message: 'Conversation exportée avec succès',
        color: 'green',
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'exporter la conversation',
        color: 'red',
      });
    }
  };

  return (
    <>
      <LoadingOverlay visible={isLoading} />
      
    <Stack spacing="md">
      <Paper shadow="sm" p="md">
          <Group position="apart" mb="md">
            <Title order={3}>Historique des conversations</Title>
            <Group>
              <Badge color={
                modelType === 'local' ? "blue" : 
                modelType === 'openai' ? "green" : 
                modelType === 'openrouter' ? "orange" : 
                "violet"
              }>
                Mode: {
                  modelType === 'local' ? "Local" : 
                  modelType === 'openai' ? "OpenAI" : 
                  modelType === 'groq' ? "Groq" : 
                  modelType === 'openrouter' ? "OpenRouter" : 
                  "Gemini"
                }
              </Badge>
              <Badge>{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</Badge>
            </Group>
          </Group>
          
          <Grid mb="md">
            <Grid.Col span={8}>
              <TextInput
                placeholder="Rechercher dans les conversations..."
                icon={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                placeholder="Trier par..."
                data={[
                  { value: 'lastUpdated', label: 'Dernière mise à jour' },
                  { value: 'date', label: 'Date de création' },
                  { value: 'title', label: 'Titre' },
                  { value: 'messages', label: 'Nombre de messages' },
                ]}
                value={sortOrder}
                onChange={setSortOrder}
                icon={sortOrder === 'lastUpdated' || sortOrder === 'date' || sortOrder === 'messages' ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />}
              />
            </Grid.Col>
          </Grid>
          
          <Divider mb="md" />
          
          {filteredConversations.length > 0 ? (
            filteredConversations.map(conversation => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onView={handleViewConversation}
              onDelete={(id) => {
                setDeletingId(id);
                  openDeleteModal();
              }}
              onExport={handleExportConversation}
                onEdit={handleEditConversation}
            />
          ))
          ) : (
            searchQuery ? (
              <Text c="dimmed" ta="center" py="xl">
                Aucune conversation ne correspond à votre recherche.
              </Text>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            Vous n'avez pas encore de conversations enregistrées.
          </Text>
            )
        )}
      </Paper>
      </Stack>
      
      {/* Modal de confirmation de suppression */}
      <Modal 
        opened={deleteModalOpened} 
        onClose={closeDeleteModal}
        title="Confirmer la suppression"
        centered
      >
        <Text mb="xl">Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.</Text>
        <Group position="right">
          <Button variant="outline" onClick={closeDeleteModal}>Annuler</Button>
          <Button color="red" onClick={handleDeleteConfirm}>Supprimer</Button>
        </Group>
      </Modal>
      
      {/* Modal d'édition du titre */}
      <Modal
        opened={editModalOpened}
        onClose={closeEditModal}
        title="Renommer la conversation"
        centered
      >
        <TextInput
          label="Nouveau titre"
          placeholder="Entrez un nouveau titre"
          value={editingConversation.title}
          onChange={(e) => setEditingConversation({ ...editingConversation, title: e.target.value })}
          mb="md"
        />
        <Group position="right">
          <Button variant="outline" onClick={closeEditModal}>Annuler</Button>
          <Button onClick={handleEditConfirm} disabled={!editingConversation.title.trim()}>Enregistrer</Button>
        </Group>
      </Modal>
    </>
  );
};

export default History; 