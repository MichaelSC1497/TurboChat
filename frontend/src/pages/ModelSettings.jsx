import React, { useState } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  Grid, 
  Box, 
  Text, 
  Alert, 
  Group, 
  Select, 
  Switch, 
  Tabs, 
  Anchor, 
  TextInput,
  Button,
  Accordion,
  Slider,
  Table,
  Badge,
  Card
} from '@mantine/core';
import { 
  IconSettings, 
  IconServer, 
  IconCloud, 
  IconBrandOpenai, 
  IconBrandGoogle, 
  IconAlertCircle, 
  IconRocket
} from '@tabler/icons-react';

const ModelSettings = () => {
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
    n_ctx: 1024,
    max_tokens: 1024,
    tone: 'default',
  });
  const [autoSave, setAutoSave] = useState(true);
  const [modelType, setModelType] = useState('local');
  const [localModels, setLocalModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [useApi, setUseApi] = useState(false);
  const [openAiKey, setOpenAiKey] = useState('');
  const [openAiModel, setOpenAiModel] = useState('gpt-3.5-turbo');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-pro');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.1-8b-instant');

  const handleParameterChange = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const toggleAutoSave = (checked) => {
    setAutoSave(checked);
  };

  const resetToDefaults = () => {
    setParameters({
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
      n_ctx: 1024,
      max_tokens: 1024,
      tone: 'default',
    });
    setAutoSave(true);
    setModelType('local');
    setLocalModels([]);
    setSelectedModel('');
    setUseApi(false);
    setOpenAiKey('');
    setOpenAiModel('gpt-3.5-turbo');
    setGeminiApiKey('');
    setGeminiModel('gemini-pro');
    setGroqApiKey('');
    setGroqModel('llama-3.1-8b-instant');
  };

  const saveSettings = () => {
    // Implementation of saveSettings function
  };

  return (
    <Container my="lg" size="lg">
      <Title order={2} mb="md" align="center">Paramètres du modèle</Title>
      
      <Paper withBorder p="md" mb="lg" shadow="xs">
        <Title order={4} mb="md" align="center">Paramètres généraux</Title>
        
        <Grid>
          <Grid.Col span={6}>
            <Box mb="md">
              <Title order={5} mb="sm">Température</Title>
              <Slider
                value={parameters.temperature}
                onChange={(value) => handleParameterChange('temperature', value)}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1' }
                ]}
                label={(value) => value.toFixed(1)}
              />
            </Box>
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Box mb="md">
              <Title order={5} mb="sm">Top-P</Title>
              <Slider
                value={parameters.top_p}
                onChange={(value) => handleParameterChange('top_p', value)}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1' }
                ]}
                label={(value) => value.toFixed(1)}
              />
            </Box>
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Box mb="md">
              <Title order={5} mb="sm">Pénalisation de fréquence</Title>
              <Slider
                value={parameters.frequency_penalty}
                onChange={(value) => handleParameterChange('frequency_penalty', value)}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                  { value: 2, label: '2' }
                ]}
                label={(value) => value.toFixed(1)}
              />
            </Box>
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Box mb="md">
              <Title order={5} mb="sm">Pénalisation de présence</Title>
              <Slider
                value={parameters.presence_penalty}
                onChange={(value) => handleParameterChange('presence_penalty', value)}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                  { value: 2, label: '2' }
                ]}
                label={(value) => value.toFixed(1)}
              />
            </Box>
          </Grid.Col>
        </Grid>
      </Paper>
      
      <Accordion>
        <Accordion.Item value="advanced">
          <Accordion.Control icon={<IconSettings size={20} />}>
            <Text fw={500}>Options avancées du modèle</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Taille du contexte (n_ctx)"
                  description="Nombre maximum de tokens par conversation"
                  value={parameters.n_ctx.toString()}
                  onChange={(value) => handleParameterChange('n_ctx', parseInt(value))}
                  data={[
                    { value: '1024', label: '1024 - Petit' },
                    { value: '2048', label: '2048 - Moyen' },
                    { value: '4096', label: '4096 - Grand' },
                    { value: '8192', label: '8192 - Très grand (lent)' },
                  ]}
                />
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Select
                  label="Nombre maximum de tokens"
                  description="Limite la longueur des réponses générées"
                  value={parameters.max_tokens.toString()}
                  onChange={(value) => handleParameterChange('max_tokens', parseInt(value))}
                  data={[
                    { value: '256', label: '256 - Très court' },
                    { value: '512', label: '512 - Court' },
                    { value: '1024', label: '1024 - Moyen' },
                    { value: '2048', label: '2048 - Long' },
                    { value: '4096', label: '4096 - Très long' },
                  ]}
                />
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Select
                  label="Ton de l'assistant"
                  description="Style des réponses"
                  value={parameters.tone}
                  onChange={(value) => handleParameterChange('tone', value)}
                  data={[
                    { value: 'default', label: 'Par défaut' },
                    { value: 'teacher', label: 'Professeur' },
                    { value: 'simple', label: 'Simplifié' },
                    { value: 'detailed', label: 'Détaillé' },
                  ]}
                />
              </Grid.Col>
              
              <Grid.Col span={6}>
                <Switch
                  label="Activer l'auto-sauvegarde"
                  description="Sauvegarde automatiquement les conversations"
                  checked={autoSave}
                  onChange={(event) => toggleAutoSave(event.currentTarget.checked)}
                  mt="md"
                />
              </Grid.Col>
            </Grid>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      
      <Paper withBorder p="md" mt="lg" shadow="xs">
        <Title order={4} mb="md" align="center">Choix du modèle</Title>
        <Tabs value={modelType} onChange={setModelType}>
          <Tabs.List position="center">
            <Tabs.Tab value="local" icon={<IconServer size={14} />}>
              Local
            </Tabs.Tab>
            <Tabs.Tab value="api" icon={<IconCloud size={14} />}>
              API TurboChat
            </Tabs.Tab>
            <Tabs.Tab value="openai" icon={<IconBrandOpenai size={14} />}>
              OpenAI
            </Tabs.Tab>
            <Tabs.Tab value="gemini" icon={<IconBrandGoogle size={14} />}>
              Google Gemini
            </Tabs.Tab>
            <Tabs.Tab value="groq" icon={<IconRocket size={14} />}>
              Groq
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="local" pt="xs">
            <Text mb="md" align="center">
              Sélectionnez un modèle disponible localement sur votre machine.
            </Text>
            
            {localModels.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} title="Aucun modèle local détecté" color="yellow">
                Aucun modèle n'a été détecté dans le dossier models/. Vous pouvez ajouter des modèles 
                depuis <Anchor href="https://huggingface.co/TheBloke" target="_blank">HuggingFace (TheBloke)</Anchor> au format GGUF.
              </Alert>
            ) : (
              <Group position="center">
                <Select
                  label="Modèle local"
                  placeholder="Sélectionnez un modèle"
                  data={localModels.map(model => ({ value: model.id, label: model.name }))}
                  value={selectedModel}
                  onChange={setSelectedModel}
                  searchable
                  nothingFound="Aucun modèle trouvé"
                  style={{ width: "80%" }}
                />
              </Group>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="api" pt="xs">
            <Text mb="md" align="center">
              Utiliser l'API TurboChat pour accéder aux fonctionnalités avancées sans installation locale.
            </Text>
            <Box style={{ display: 'flex', justifyContent: 'center' }}>
              <Switch
                label="Utiliser l'API TurboChat"
                checked={useApi}
                onChange={(event) => setUseApi(event.currentTarget.checked)}
              />
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="openai" pt="xs">
            <Text mb="md" align="center">
              Connectez-vous à l'API OpenAI pour utiliser leurs modèles.
            </Text>
            <Grid justify="center">
              <Grid.Col span={8}>
                <TextInput
                  label="Clé API OpenAI"
                  placeholder="sk-..."
                  value={openAiKey}
                  onChange={(event) => setOpenAiKey(event.currentTarget.value)}
                  mb="md"
                />
                
                <Select
                  label="Modèle OpenAI"
                  placeholder="Sélectionnez un modèle"
                  data={[
                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                    { value: 'gpt-4', label: 'GPT-4' },
                    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                    { value: 'gpt-4o', label: 'GPT-4o' },
                  ]}
                  value={openAiModel}
                  onChange={setOpenAiModel}
                  mb="md"
                />
                
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  <Text size="sm">
                    Les limites d'utilisation dépendent de votre abonnement OpenAI. Consultez votre tableau de bord pour plus d'informations.
                  </Text>
                </Alert>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="gemini" pt="xs">
            <Text mb="md" align="center">
              Utilisez les modèles Google Gemini pour vos conversations.
            </Text>
            <Grid justify="center">
              <Grid.Col span={8}>
                <TextInput
                  label="Clé API Google Gemini"
                  placeholder="AIza..."
                  value={geminiApiKey}
                  onChange={(event) => setGeminiApiKey(event.currentTarget.value)}
                  mb="md"
                />
                
                <Select
                  label="Modèle Gemini"
                  placeholder="Sélectionnez un modèle"
                  data={[
                    { value: 'gemini-pro', label: 'Gemini Pro' },
                    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
                  ]}
                  value={geminiModel}
                  onChange={setGeminiModel}
                  mb="md"
                />
                
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  <Text size="sm">
                    L'API Gemini propose une offre gratuite avec des limites de 1M de tokens par minute et 1500 requêtes par jour.
                  </Text>
                </Alert>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
          
          <Tabs.Panel value="groq" pt="xs">
            <Text mb="md" align="center">
              Profitez des modèles haute performance de Groq, conçus pour offrir une inférence ultra-rapide.
            </Text>
            <Grid justify="center">
              <Grid.Col span={8}>
                <TextInput
                  label="Clé API Groq"
                  placeholder="gsk_..."
                  value={groqApiKey}
                  onChange={(event) => setGroqApiKey(event.currentTarget.value)}
                  mb="md"
                />
                
                <Select
                  label="Modèle Groq"
                  placeholder="Sélectionnez un modèle"
                  data={[
                    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
                    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
                    { value: 'llama3-8b-8192', label: 'Llama3 8B' },
                    { value: 'llama3-70b-8192', label: 'Llama3 70B' },
                    { value: 'gemma2-9b-it', label: 'Gemma2 9B IT' },
                    { value: 'mistral-saba-24b', label: 'Mistral Saba 24B' },
                    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8X7B' },
                    { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama-4 Scout 17B' },
                    { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama-4 Maverick 17B' },
                  ]}
                  value={groqModel}
                  onChange={setGroqModel}
                  mb="md"
                />
                
                <Card withBorder p="md" mb="md">
                  <Title order={5} mb="xs">Limites d'utilisation Groq (Offre gratuite)</Title>
                  <Table>
                    <thead>
                      <tr>
                        <th>Modèle</th>
                        <th>RPM</th>
                        <th>RPD</th>
                        <th>TPM</th>
                        <th>TPD</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Modèles standard (LLaMA, Gemma, etc.)</td>
                        <td>30</td>
                        <td>14400</td>
                        <td>6000</td>
                        <td>500000</td>
                      </tr>
                      <tr>
                        <td>Modèles avancés (70B)</td>
                        <td>30</td>
                        <td>1000</td>
                        <td>12000</td>
                        <td>100000</td>
                      </tr>
                    </tbody>
                  </Table>
                  <Text size="xs" mt="xs">
                    RPM: Requêtes par minute | RPD: Requêtes par jour | TPM: Tokens par minute | TPD: Tokens par jour
                  </Text>
                </Card>
                
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  <Text size="sm">
                    La clé API Groq peut être obtenue gratuitement sur <Anchor href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</Anchor>. 
                    Groq est connu pour son inférence extrêmement rapide, même avec les grands modèles de langage.
                  </Text>
                </Alert>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Paper>
      
      <Group position="center" mt="xl">
        <Button onClick={resetToDefaults} variant="outline" color="red">
          Réinitialiser
        </Button>
        <Button onClick={saveSettings} color="blue">
          Enregistrer
        </Button>
      </Group>
    </Container>
  );
};

export default ModelSettings; 