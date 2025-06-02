import { 
  Title, 
  Text, 
  Paper,
  SimpleGrid,
  Card,
  Group,
  Stack,
  List
} from '@mantine/core';
import { 
  IconBook, 
  IconMath, 
  IconLanguage, 
  IconAtom, 
  IconMapPin,
  IconBallpen, 
  IconHistory, 
  IconPencil
} from '@tabler/icons-react';

const ResourceCard = ({ title, description, icon, subjects }) => {
  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Card.Section bg="blue.1" p="md">
        <Group>
          {icon}
          <Title order={4}>{title}</Title>
        </Group>
      </Card.Section>
      
      <Text mt="md" mb="md" c="dimmed" size="sm">
        {description}
      </Text>
      
      <List size="sm">
        {subjects.map((subject, index) => (
          <List.Item key={index}>{subject}</List.Item>
        ))}
      </List>
    </Card>
  );
};

const Resources = () => {
  const resourceCategories = [
    {
      title: "Mathématiques",
      description: "Concepts et méthodes mathématiques du collège au lycée",
      icon: <IconMath size={24} />,
      subjects: [
        "Algèbre et équations",
        "Géométrie et trigonométrie",
        "Analyse et fonctions",
        "Probabilités et statistiques"
      ]
    },
    {
      title: "Sciences Physiques",
      description: "Principes et expériences de physique et chimie",
      icon: <IconAtom size={24} />,
      subjects: [
        "Mécanique et forces",
        "Électricité et magnétisme",
        "Optique et ondes",
        "Chimie organique et minérale"
      ]
    },
    {
      title: "Français",
      description: "Langue, littérature et expression écrite",
      icon: <IconPencil size={24} />,
      subjects: [
        "Grammaire et conjugaison",
        "Littérature et mouvements littéraires",
        "Commentaire et dissertation",
        "Argumentation et persuasion"
      ]
    },
    {
      title: "Langues",
      description: "Anglais, espagnol, allemand et autres langues",
      icon: <IconLanguage size={24} />,
      subjects: [
        "Vocabulaire et expressions",
        "Grammaire et temps",
        "Compréhension orale et écrite",
        "Culture et civilisation"
      ]
    },
    {
      title: "Histoire-Géographie",
      description: "Périodes historiques et concepts géographiques",
      icon: <IconHistory size={24} />,
      subjects: [
        "Histoire ancienne et médiévale",
        "Histoire moderne et contemporaine",
        "Géographie humaine et économique",
        "Géopolitique et mondialisation"
      ]
    },
    {
      title: "SVT",
      description: "Biologie, géologie et environnement",
      icon: <IconBook size={24} />,
      subjects: [
        "Génétique et évolution",
        "Corps humain et santé",
        "Écologie et biodiversité",
        "Géologie et climatologie"
      ]
    }
  ];

  const howToUse = [
    "Posez des questions précises sur un sujet ou un concept",
    "Demandez des explications adaptées à votre niveau (collège ou lycée)",
    "Sollicitez des exercices d'application sur un thème",
    "Demandez la correction d'un exercice ou d'un problème",
    "Utilisez l'assistant pour réviser avant un contrôle ou un examen"
  ];

  return (
    <Stack spacing="md">
      <Paper shadow="sm" p="md">
        <Title order={3} mb="md">Ressources pédagogiques</Title>
        <Text color="dimmed" mb="xl" ta="center" maw={800} mx="auto">
          TurboChat peut vous aider dans de nombreux domaines. Consultez les catégories
          ci-dessous pour découvrir toutes les possibilités.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {resourceCategories.map((category, index) => (
            <ResourceCard 
              key={index} 
              title={category.title} 
              description={category.description} 
              icon={category.icon}
              subjects={category.subjects}
            />
          ))}
        </SimpleGrid>
      </Paper>

      <Paper shadow="sm" p="md">
        <Title order={3} mb="md">Comment utiliser l'assistant</Title>
        <Text color="dimmed" mb="xl" ta="center" maw={800} mx="auto">
          Pour tirer le meilleur parti de TurboChat, voici quelques conseils d'utilisation :
        </Text>
        
        <List spacing="sm">
          {howToUse.map((tip, index) => (
            <List.Item key={index}>{tip}</List.Item>
          ))}
        </List>
      </Paper>
    </Stack>
  );
};

export default Resources; 