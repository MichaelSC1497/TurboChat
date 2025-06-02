import { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Stack, 
  Card, 
  Group, 
  Badge, 
  Progress, 
  Loader, 
  SimpleGrid,
  Button, 
  Alert,
  List,
  ThemeIcon,
  RingProgress
} from '@mantine/core';
import { IconInfoCircle, IconClock, IconDownload, IconExclamationCircle } from '@tabler/icons-react';
import axios from 'axios';
import { useModel } from '../contexts/ModelContext';

const TokenUsage = () => {
  const { modelType } = useModel();
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const fetchUsageData = async () => {
    try {
      const response = await axios.get('/api/token-usage');
      setUsageData(response.data);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des données d\'utilisation:', err);
      setError('Impossible de charger les données d\'utilisation. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    if (modelType !== 'local') {
      fetchUsageData();
      
      // Rafraîchir automatiquement toutes les 30 secondes
      const interval = setInterval(() => {
        fetchUsageData();
      }, 30000);
      
      setRefreshInterval(interval);
      
      // Cleanup à la destruction du composant
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      };
    } else {
      setLoading(false);
      setError('Le suivi des tokens n\'est disponible que pour les modèles API.');
    }
  }, [modelType]);

  // Formater les nombres avec des séparateurs
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  // Exporter les données d'utilisation
  const exportData = () => {
    if (!usageData) return;
    
    const dataStr = JSON.stringify(usageData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `token-usage-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconExclamationCircle size={16} />} title="Erreur" color="red">
        {error}
      </Alert>
    );
  }

  if (!usageData || !usageData.token_usage) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} title="Information" color="blue">
        Aucune donnée d'utilisation disponible. Essayez d'envoyer quelques messages d'abord.
      </Alert>
    );
  }

  const tokenUsage = usageData.token_usage;
  const totalTokens = tokenUsage.total_input_tokens + tokenUsage.total_output_tokens;
  const history = usageData.history || [];
  
  // Calcul du pourcentage d'utilisation (basé sur les limites gratuites pour Gemini)
  const limits = usageData.limits && usageData.limits[modelType];
  let usagePercent = 0;
  if (limits && limits.free_tpm) {
    usagePercent = Math.min(100, (totalTokens / limits.free_tpm) * 100);
  }

  return (
    <Stack spacing="md">
      <Group position="apart">
        <Title order={3}>Suivi d'utilisation des tokens</Title>
        <Button 
          size="sm" 
          onClick={fetchUsageData} 
          leftSection={<IconClock size={16} />}
        >
          Actualiser
        </Button>
      </Group>
      
      <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">Utilisation globale</Title>
          
          <Group position="apart" mb="md">
            <div>
              <Text fw={500} size="lg">{formatNumber(totalTokens)}</Text>
              <Text size="sm" color="dimmed">Total des tokens utilisés</Text>
            </div>
            
            <RingProgress
              size={120}
              thickness={12}
              roundCaps
              sections={[
                { value: (tokenUsage.total_input_tokens / totalTokens) * 100, color: 'blue' },
                { value: (tokenUsage.total_output_tokens / totalTokens) * 100, color: 'green' },
              ]}
              label={
                <Text size="xs" ta="center">
                  {formatNumber(totalTokens)} tokens
                </Text>
              }
            />
          </Group>
          
          <Group grow mb="md">
            <div>
              <Text fw={500}>{formatNumber(tokenUsage.total_input_tokens)}</Text>
              <Badge color="blue" variant="light">Entrée</Badge>
            </div>
            <div>
              <Text fw={500}>{formatNumber(tokenUsage.total_output_tokens)}</Text>
              <Badge color="green" variant="light">Sortie</Badge>
            </div>
          </Group>
          
          {limits && (
            <>
              <Text fw={500} mb="xs">Limites ({modelType})</Text>
              <Progress 
                value={usagePercent} 
                color={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'teal'} 
                size="lg" 
                radius="xl" 
                mb="xs"
              />
              <Group position="apart">
                <Text size="xs">0</Text>
                <Text size="xs" fw={500}>{usagePercent.toFixed(1)}%</Text>
                <Text size="xs">{formatNumber(limits.free_tpm || 0)}</Text>
              </Group>
              
              <List size="sm" mt="md" spacing="xs">
                <List.Item>
                  Requêtes par minute: {limits.free_rpm || "Variable"}
                </List.Item>
                <List.Item>
                  Tokens par minute: {formatNumber(limits.free_tpm || 0)}
                </List.Item>
                <List.Item>
                  Requêtes par jour: {formatNumber(limits.free_rpd || 0)}
                </List.Item>
              </List>
            </>
          )}
          
          <Button 
            variant="outline" 
            fullWidth 
            mt="md"
            onClick={exportData}
            leftSection={<IconDownload size={16} />}
          >
            Exporter les données
          </Button>
        </Card>
        
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">Historique des requêtes récentes</Title>
          
          {history.length > 0 ? (
            <Stack>
              {history.map((entry, index) => (
                <Paper key={index} p="xs" withBorder>
                  <Group position="apart" mb="xs">
                    <Text size="sm" fw={500}>Requête #{history.length - index}</Text>
                    <Badge size="sm">{new Date(entry.timestamp).toLocaleTimeString()}</Badge>
                  </Group>
                  <Text size="xs" lineClamp={2} mb="xs">{entry.input_preview}</Text>
                  <Group grow>
                    <div>
                      <Text size="xs">Entrée: {formatNumber(entry.input_tokens)} tokens</Text>
                    </div>
                    <div>
                      <Text size="xs">Sortie: {formatNumber(entry.output_tokens)} tokens</Text>
                    </div>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text color="dimmed" ta="center">Aucun historique disponible</Text>
          )}
        </Card>
      </SimpleGrid>
      
      <Alert icon={<IconInfoCircle size={16} />} color="blue">
        <Text size="sm">
          Pour l'API Gemini, les limites gratuites sont approximativement de 1 million de tokens par minute et 1 500 requêtes par jour.
          Pour l'API OpenAI, les limites dépendent de votre abonnement.
        </Text>
      </Alert>
    </Stack>
  );
};

export default TokenUsage; 