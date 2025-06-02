import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Card,
  Tabs,
  TextInput,
  Badge,
  Accordion,
  FileInput,
  ActionIcon,
  Loader,
  Box,
  Textarea,
  Select,
  Switch,
  NumberInput,
  Divider,
  Alert,
  List,
  ScrollArea,
  Modal,
  Notification,
  Code,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconSearch, IconTrash, IconPlus, IconExclamationCircle, IconX, IconInfoCircle } from '@tabler/icons-react';

export default function RagManager() {
  // États
  const [activeTab, setActiveTab] = useState('collections');
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [queryTopK, setQueryTopK] = useState(3);
  const [useHybridSearch, setUseHybridSearch] = useState(true);
  const [queryResults, setQueryResults] = useState(null);
  const [searchTime, setSearchTime] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);

  // Charger les collections au chargement de la page
  useEffect(() => {
    fetchCollections();
  }, []);

  // Récupérer les collections
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/rag/collections');
      setCollections(response.data.collections || []);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: `Impossible de récupérer les collections: ${error.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Créer une nouvelle collection
  const createCollection = async () => {
    if (!newCollectionName) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer un nom de collection',
        color: 'red',
      });
      return;
    }

    setCreatingCollection(true);
    try {
      await axios.post(`/api/rag/collections/${newCollectionName}`);
      notifications.show({
        title: 'Succès',
        message: `Collection "${newCollectionName}" créée avec succès`,
        color: 'green',
      });
      setNewCollectionName('');
      fetchCollections();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: `Impossible de créer la collection: ${error.response?.data?.message || error.message}`,
        color: 'red',
      });
    } finally {
      setCreatingCollection(false);
    }
  };

  // Supprimer une collection
  const deleteCollection = async () => {
    if (!collectionToDelete) return;
    
    setLoading(true);
    try {
      await axios.delete(`/api/rag/collections/${collectionToDelete}`);
      notifications.show({
        title: 'Succès',
        message: `Collection "${collectionToDelete}" supprimée avec succès`,
        color: 'green',
      });
      if (selectedCollection === collectionToDelete) {
        setSelectedCollection(null);
      }
      fetchCollections();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: `Impossible de supprimer la collection: ${error.response?.data?.message || error.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
      setCollectionToDelete(null);
    }
  };

  // Télécharger et indexer un fichier
  const uploadFile = async () => {
    if (!file || !selectedCollection) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner un fichier et une collection',
        color: 'red',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_name', selectedCollection);

    setUploadStatus('uploading');
    try {
      const response = await axios.post('/api/rag/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadStatus('success');
      notifications.show({
        title: 'Succès',
        message: `Fichier ${file.name} indexé avec succès dans ${selectedCollection}`,
        color: 'green',
      });
      fetchCollections();
      setFile(null);
    } catch (error) {
      setUploadStatus('error');
      notifications.show({
        title: 'Erreur',
        message: `Erreur lors de l'indexation: ${error.response?.data?.detail || error.message}`,
        color: 'red',
      });
    }
  };

  // Interroger une collection
  const queryCollection = async () => {
    if (!queryText || !selectedCollection) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer une requête et sélectionner une collection',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/rag/query', {
        query: queryText,
        collection_name: selectedCollection,
        top_k: queryTopK,
        hybrid_search: useHybridSearch,
      });
      setQueryResults(response.data);
      setSearchTime(response.data.elapsed_time);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: `Erreur lors de la requête: ${error.response?.data?.detail || error.message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatage des résultats
  const renderQueryResults = () => {
    if (!queryResults || !queryResults.contexts || queryResults.contexts.length === 0) {
      return <Text>Aucun résultat trouvé.</Text>;
    }

    return (
      <Box>
        <Text mb="md">
          {queryResults.contexts.length} résultats trouvés en {searchTime?.toFixed(3)} secondes
        </Text>
        <Accordion>
          {queryResults.contexts.map((context, index) => (
            <Accordion.Item key={index} value={`result-${index}`}>
              <Accordion.Control>
                <Group>
                  <Badge>Résultat {index + 1}</Badge>
                  <Text lineClamp={1}>{queryResults.sources[index]?.metadata?.filename || 'Source inconnue'}</Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <ScrollArea h={200}>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{context}</Text>
                </ScrollArea>
                <Divider my="sm" />
                <Box>
                  <Text size="sm" fw={700}>Métadonnées:</Text>
                  <Code block>{JSON.stringify(queryResults.sources[index]?.metadata || {}, null, 2)}</Code>
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Box>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Paper p="md" shadow="xs" withBorder mb="lg">
        <Title order={2} mb="md">Gestionnaire de base de connaissances RAG</Title>
        <Text c="dimmed" mb="lg">
          Ce module vous permet de créer et gérer des collections de documents pour l'utilisation avec la fonctionnalité
          RAG (Retrieval-Augmented Generation) du système.
        </Text>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="collections" icon={<IconInfoCircle size={14} />}>
              Collections
            </Tabs.Tab>
            <Tabs.Tab value="documents" icon={<IconUpload size={14} />}>
              Ajouter des documents
            </Tabs.Tab>
            <Tabs.Tab value="query" icon={<IconSearch size={14} />}>
              Interroger
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="collections" pt="xs">
            <Box my="md">
              <Title order={3} mb="md">Collections disponibles</Title>
              
              <Group mb="md">
                <TextInput
                  placeholder="Nom de la nouvelle collection"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button 
                  leftIcon={<IconPlus size={16} />}
                  onClick={createCollection}
                  loading={creatingCollection}
                >
                  Créer
                </Button>
              </Group>

              {loading ? (
                <Loader />
              ) : collections.length === 0 ? (
                <Alert icon={<IconExclamationCircle size={16} />} title="Aucune collection" color="blue">
                  Vous n'avez pas encore de collections. Créez-en une pour commencer à utiliser le RAG.
                </Alert>
              ) : (
                <Grid>
                  {collections.map((collection) => (
                    <Grid.Col key={collection.name} span={4}>
                      <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group position="apart" mb="xs">
                          <Text fw={500}>{collection.name}</Text>
                          <ActionIcon 
                            color="red" 
                            onClick={() => {
                              setCollectionToDelete(collection.name);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                        <Text size="sm" c="dimmed" mb="xs">
                          {collection.description || 'Aucune description'}
                        </Text>
                        <Group mt="md" mb="xs">
                          <Badge color="blue">{collection.document_count} document(s)</Badge>
                          <Badge color="teal">{collection.chunk_count} chunk(s)</Badge>
                        </Group>
                        <Button 
                          variant="light" 
                          color="blue" 
                          fullWidth 
                          mt="md" 
                          radius="md"
                          onClick={() => setSelectedCollection(collection.name)}
                          disabled={selectedCollection === collection.name}
                        >
                          {selectedCollection === collection.name ? 'Sélectionnée' : 'Sélectionner'}
                        </Button>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="documents" pt="xs">
            <Box my="md">
              <Title order={3} mb="md">Ajouter des documents</Title>
              
              {!selectedCollection ? (
                <Alert icon={<IconExclamationCircle size={16} />} title="Collection non sélectionnée" color="yellow">
                  Veuillez d'abord sélectionner une collection dans l'onglet "Collections".
                </Alert>
              ) : (
                <>
                  <Text mb="md">
                    Vous ajoutez des documents à la collection: <Badge size="lg">{selectedCollection}</Badge>
                  </Text>
                  
                  <Paper withBorder p="md" mb="md">
                    <Title order={4} mb="md">Télécharger un fichier</Title>
                    <Text size="sm" c="dimmed" mb="md">
                      Formats supportés: PDF, TXT, DOCX, HTML, CSV, MD
                    </Text>
                    
                    <Group position="apart" mb="md">
                      <FileInput
                        placeholder="Choisir un fichier"
                        label="Document à indexer"
                        description="Le fichier sera découpé et indexé automatiquement"
                        withAsterisk
                        accept=".pdf,.txt,.docx,.html,.csv,.md"
                        icon={<IconUpload size={14} />}
                        value={file}
                        onChange={setFile}
                        style={{ flex: 1 }}
                        disabled={uploadStatus === 'uploading'}
                      />
                    </Group>
                    
                    <Button
                      onClick={uploadFile}
                      loading={uploadStatus === 'uploading'}
                      disabled={!file}
                      fullWidth
                    >
                      {uploadStatus === 'uploading' ? 'Indexation en cours...' : 'Télécharger et indexer'}
                    </Button>
                    
                    {uploadStatus === 'success' && (
                      <Alert title="Succès" color="green" withCloseButton onClose={() => setUploadStatus(null)} mt="md">
                        Le fichier a été indexé avec succès.
                      </Alert>
                    )}
                    
                    {uploadStatus === 'error' && (
                      <Alert title="Erreur" color="red" withCloseButton onClose={() => setUploadStatus(null)} mt="md">
                        Une erreur s'est produite lors de l'indexation.
                      </Alert>
                    )}
                  </Paper>
                </>
              )}
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="query" pt="xs">
            <Box my="md">
              <Title order={3} mb="md">Interroger la base de connaissances</Title>
              
              {!selectedCollection ? (
                <Alert icon={<IconExclamationCircle size={16} />} title="Collection non sélectionnée" color="yellow">
                  Veuillez d'abord sélectionner une collection dans l'onglet "Collections".
                </Alert>
              ) : (
                <>
                  <Text mb="md">
                    Vous interrogez la collection: <Badge size="lg">{selectedCollection}</Badge>
                  </Text>
                  
                  <Paper withBorder p="md" mb="md">
                    <Textarea
                      placeholder="Entrez votre requête ici"
                      label="Requête"
                      description="Posez une question sur le contenu de vos documents"
                      withAsterisk
                      minRows={3}
                      value={queryText}
                      onChange={(e) => setQueryText(e.currentTarget.value)}
                      mb="md"
                    />
                    
                    <Group grow mb="md">
                      <NumberInput
                        label="Nombre de résultats"
                        description="Nombre maximum de chunks à récupérer"
                        value={queryTopK}
                        onChange={(val) => setQueryTopK(val)}
                        min={1}
                        max={10}
                      />
                      
                      <Switch
                        label="Recherche hybride"
                        description="Combiner la recherche vectorielle et par mots-clés"
                        checked={useHybridSearch}
                        onChange={(e) => setUseHybridSearch(e.currentTarget.checked)}
                      />
                    </Group>
                    
                    <Button
                      onClick={queryCollection}
                      loading={loading}
                      disabled={!queryText}
                      fullWidth
                    >
                      Rechercher
                    </Button>
                  </Paper>
                  
                  {queryResults && (
                    <Paper withBorder p="md">
                      <Title order={4} mb="md">Résultats</Title>
                      {renderQueryResults()}
                    </Paper>
                  )}
                </>
              )}
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* Modal de confirmation de suppression */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmer la suppression"
      >
        <Text mb="md">
          Êtes-vous sûr de vouloir supprimer la collection "{collectionToDelete}" ?
          Cette action est irréversible et tous les documents indexés seront perdus.
        </Text>
        
        <Group position="right">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
            Annuler
          </Button>
          <Button color="red" onClick={deleteCollection} loading={loading}>
            Supprimer
          </Button>
        </Group>
      </Modal>
    </Container>
  );
} 