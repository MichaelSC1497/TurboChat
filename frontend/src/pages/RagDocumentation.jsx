import React from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Divider, 
  List, 
  Card, 
  Space, 
  Code, 
  Accordion, 
  Alert, 
  Paper, 
  Table,
  Badge,
  Group
} from '@mantine/core';
import { 
  IconInfoCircle, 
  IconAlertCircle, 
  IconDatabase, 
  IconSearch,
  IconBulb,
  IconBooks,
  IconFileUpload
} from '@tabler/icons-react';

const RagDocumentation = () => {
  return (
    <Container size="lg" py="xl">
      <Title order={1} align="center" mb="xl">Documentation du Système RAG</Title>
      <Text mb="lg">
        Le système RAG (Retrieval-Augmented Generation) permet d'enrichir les réponses du modèle d'intelligence artificielle en utilisant des documents pertinents pour apporter du contexte supplémentaire à ses réponses.
      </Text>

      <Divider my="lg" label={<Group><IconInfoCircle size={16} /><Text>Qu'est-ce que le RAG?</Text></Group>} labelPosition="center" />

      <Card withBorder shadow="sm" p="lg" mb="lg">
        <Text>
          Le RAG (Retrieval-Augmented Generation) est une technique qui combine la récupération d'informations et la génération de texte. Elle permet d'améliorer la qualité et la précision des réponses générées par un modèle de langage en lui fournissant des informations externes pertinentes.
        </Text>
        <Space h="md" />
        <Text>
          Le RAG fonctionne en deux étapes principales :
        </Text>
        <List>
          <List.Item>
            <strong>Récupération (Retrieval)</strong> : Le système recherche des informations pertinentes dans une base de connaissances en fonction de la requête de l'utilisateur.
          </List.Item>
          <List.Item>
            <strong>Génération (Generation)</strong> : Les informations récupérées sont utilisées comme contexte supplémentaire pour générer une réponse plus précise et informative.
          </List.Item>
        </List>
      </Card>

      <Divider my="lg" label={<Group><IconBooks size={16} /><Text>Comment utiliser le RAG</Text></Group>} labelPosition="center" />

      <Paper withBorder p="lg" mb="lg">
        <Title order={3} mb="md">Activation du RAG dans une conversation</Title>
        <Text mb="md">
          Pour utiliser le RAG dans une conversation, suivez ces étapes :
        </Text>
        <List type="ordered">
          <List.Item>Cliquez sur l'icône <IconDatabase size={16} /> dans l'interface de chat pour activer le mode RAG</List.Item>
          <List.Item>Sélectionnez la collection de documents que vous souhaitez utiliser dans le menu déroulant</List.Item>
          <List.Item>Posez votre question normalement</List.Item>
          <List.Item>Les réponses utilisant le RAG seront marquées d'un badge <Badge color="blue">RAG</Badge></List.Item>
          <List.Item>Cliquez sur le badge pour voir les sources utilisées pour générer la réponse</List.Item>
        </List>

        <Title order={3} mt="xl" mb="md">Gestion des collections</Title>
        <Text mb="md">
          Vous pouvez gérer vos collections de documents dans l'onglet RAG du menu principal :
        </Text>
        <List>
          <List.Item>
            <strong>Créer une collection</strong> : Donnez un nom à votre collection et cliquez sur "Créer"
          </List.Item>
          <List.Item>
            <strong>Ajouter des documents</strong> : Sélectionnez une collection et téléchargez vos documents
          </List.Item>
          <List.Item>
            <strong>Supprimer une collection</strong> : Cliquez sur l'icône de suppression à côté du nom de la collection
          </List.Item>
        </List>
      </Paper>

      <Divider my="lg" label={<Group><IconFileUpload size={16} /><Text>Types de documents supportés</Text></Group>} labelPosition="center" />

      <Table striped withBorder mb="lg">
        <thead>
          <tr>
            <th>Extension</th>
            <th>Type de document</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Code>.pdf</Code></td>
            <td>Documents PDF</td>
            <td>Support complet, extraction de texte et métadonnées</td>
          </tr>
          <tr>
            <td><Code>.txt</Code></td>
            <td>Fichiers texte</td>
            <td>Support complet</td>
          </tr>
          <tr>
            <td><Code>.md</Code>, <Code>.markdown</Code></td>
            <td>Documents Markdown</td>
            <td>Support complet</td>
          </tr>
          <tr>
            <td><Code>.html</Code>, <Code>.htm</Code></td>
            <td>Pages HTML</td>
            <td>Support complet</td>
          </tr>
          <tr>
            <td><Code>.csv</Code></td>
            <td>Fichiers CSV</td>
            <td>Support complet</td>
          </tr>
          <tr>
            <td><Code>.doc</Code>, <Code>.docx</Code></td>
            <td>Documents Word</td>
            <td>Support basique</td>
          </tr>
        </tbody>
      </Table>

      <Divider my="lg" label={<Group><IconBulb size={16} /><Text>Conseils d'utilisation</Text></Group>} labelPosition="center" />

      <Accordion mb="lg">
        <Accordion.Item value="precise-questions">
          <Accordion.Control>Posez des questions précises</Accordion.Control>
          <Accordion.Panel>
            <Text>
              Pour obtenir les meilleurs résultats avec le RAG, posez des questions précises qui peuvent être répondues en utilisant des informations spécifiques. Les questions vagues ou trop générales ne permettent pas au système de bien cibler les informations pertinentes.
            </Text>
            <Space h="md" />
            <Table withBorder>
              <thead>
                <tr>
                  <th>À éviter</th>
                  <th>Préférer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>"Parle-moi des mathématiques"</td>
                  <td>"Quelle est la formule du théorème de Pythagore?"</td>
                </tr>
              </tbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="collection-choice">
          <Accordion.Control>Choisissez la bonne collection</Accordion.Control>
          <Accordion.Panel>
            <Text>
              Le choix de la collection est crucial pour obtenir des réponses pertinentes. Utilisez une collection spécifique au domaine de votre question. Si vous avez plusieurs collections thématiques, choisissez celle qui correspond le mieux au sujet de votre question.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="check-sources">
          <Accordion.Control>Vérifiez toujours les sources</Accordion.Control>
          <Accordion.Panel>
            <Text>
              Le système RAG fournit les sources utilisées pour générer la réponse. Prenez l'habitude de vérifier ces sources pour vous assurer de la pertinence et de la fiabilité des informations. Cliquez sur le bouton "Voir document" pour accéder directement au document source.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="structured-docs">
          <Accordion.Control>Structurez vos documents</Accordion.Control>
          <Accordion.Panel>
            <Text>
              Pour de meilleurs résultats, utilisez des documents bien structurés avec des titres, des sous-titres et des paragraphes clairs. Cela améliore la qualité du découpage en chunks et facilite la récupération d'informations pertinentes.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Divider my="lg" label={<Group><IconAlertCircle size={16} /><Text>Limitations</Text></Group>} labelPosition="center" />

      <Alert icon={<IconAlertCircle size={16} />} title="Limitations du système RAG" color="yellow" mb="lg">
        <List>
          <List.Item>
            <strong>Informations limitées aux documents</strong> : Le RAG ne peut trouver que des informations présentes dans les documents indexés. Si l'information n'est pas dans vos documents, le modèle utilisera ses connaissances générales.
          </List.Item>
          <List.Item>
            <strong>Qualité des documents</strong> : La qualité des réponses dépend de la qualité et de la pertinence des documents indexés.
          </List.Item>
          <List.Item>
            <strong>Détection de pertinence</strong> : Le système peut parfois récupérer des informations qui semblent pertinentes mais ne répondent pas directement à la question.
          </List.Item>
          <List.Item>
            <strong>Problèmes de streaming</strong> : Certains modèles comme Qwen ne supportent pas le streaming, ce qui peut affecter l'expérience utilisateur en mode RAG.
          </List.Item>
          <List.Item>
            <strong>Taille des documents</strong> : Les documents très volumineux peuvent être découpés en chunks qui perdent parfois le contexte global.
          </List.Item>
        </List>
      </Alert>

      <Divider my="lg" label={<Group><IconSearch size={16} /><Text>Fonctionnement technique</Text></Group>} labelPosition="center" />

      <Card withBorder shadow="sm" p="lg" mb="lg">
        <Title order={3} mb="md">Architecture du système RAG</Title>
        <Text color="dimmed" size="lg" mb="xl">
          Le système RAG de TurboChat est basé sur les technologies suivantes :
        </Text>
        <List>
          <List.Item><strong>ChromaDB</strong> : Base de données vectorielle pour stocker les embeddings des documents</List.Item>
          <List.Item><strong>LangChain</strong> : Framework pour connecter le modèle de langage aux sources de données externes</List.Item>
          <List.Item><strong>Hybrid Search</strong> : Combinaison de recherche vectorielle et BM25 pour une meilleure pertinence</List.Item>
        </List>
        
        <Title order={3} mt="xl" mb="md">Processus de traitement</Title>
        <Text>
          Voici comment le système traite les documents et les requêtes :
        </Text>
        <List type="ordered">
          <List.Item><strong>Indexation</strong> : Les documents sont découpés en chunks de ~1000 caractères</List.Item>
          <List.Item><strong>Embedding</strong> : Chaque chunk est converti en vecteur d'embedding</List.Item>
          <List.Item><strong>Requête</strong> : La question de l'utilisateur est convertie en vecteur et utilisée pour rechercher les chunks les plus similaires</List.Item>
          <List.Item><strong>Récupération</strong> : Les chunks pertinents sont sélectionnés en fonction de leur similarité vectorielle et score BM25</List.Item>
          <List.Item><strong>Contextualisation</strong> : Les chunks sont intégrés au contexte du modèle de langage</List.Item>
          <List.Item><strong>Génération</strong> : Le modèle génère une réponse basée sur le contexte enrichi</List.Item>
        </List>
      </Card>
    </Container>
  );
};

export default RagDocumentation; 