import React, { useState, useEffect } from 'react';
import { 
  Container, Title, Text, Tabs, Button, Select, TextInput, NumberInput, 
  Box, Card, Group, Badge, Skeleton, Alert, Paper, List, Progress,
  Modal, Radio, Stack, Grid, Accordion, useMantineTheme, Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheckbox, IconSchool, IconTrophy, IconListCheck, IconPlus, IconChartBar, IconAlertCircle, IconArrowLeft, IconPlayerPlay, IconTrash } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE_URL = '/api';

const TurboQuizz = () => {
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState('explorer');
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ id: '', name: '' });
  const [quizResults, setQuizResults] = useState(null);
  const [openGeneratorModal, { open: openGenerator, close: closeGenerator }] = useDisclosure(false);
  const [generatorForm, setGeneratorForm] = useState({
    subject: '',
    grade_level: '',
    topic: '',
    difficulty: 'medium',
    question_count: 10,
    rag_collection: null
  });
  const [collections, setCollections] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');

  // Charger les données initiales
  useEffect(() => {
    loadQuizzes();
    loadSubjects();
    loadGradeLevels();
    loadCollections();
  }, []);

  // Filtrer les quiz lorsque les filtres changent
  useEffect(() => {
    loadQuizzes(filterSubject, filterGradeLevel);
  }, [filterSubject, filterGradeLevel]);

  // Charger la liste des quiz
  const loadQuizzes = async (subject = '', gradeLevel = '') => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/quizzes`;
      const params = {};
      if (subject) params.subject = subject;
      if (gradeLevel) params.grade_level = gradeLevel;

      const response = await axios.get(url, { params });
      setQuizzes(response.data.quizzes);
    } catch (err) {
      setError('Erreur lors du chargement des quiz');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Charger la liste des matières
  const loadSubjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/subjects`);
      setSubjects(response.data.subjects);
    } catch (err) {
      console.error('Erreur lors du chargement des matières:', err);
    }
  };

  // Charger la liste des niveaux scolaires
  const loadGradeLevels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/grade-levels`);
      setGradeLevels(response.data.grade_levels);
    } catch (err) {
      console.error('Erreur lors du chargement des niveaux scolaires:', err);
    }
  };

  // Charger la liste des collections RAG
  const loadCollections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rag/collections`);
      setCollections(response.data.collections || []);
    } catch (err) {
      console.error('Erreur lors du chargement des collections RAG:', err);
    }
  };

  // Charger les détails d'un quiz
  const loadQuizDetails = async (quizId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/quizzes/${quizId}`);
      setCurrentQuiz(response.data.quiz);
    } catch (err) {
      setError(`Erreur lors du chargement du quiz: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Charger la progression d'un élève
  const loadStudentProgress = async (studentId) => {
    if (!studentId) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/students/${studentId}/progress`);
      setStudentProgress(response.data.progress);
    } catch (err) {
      console.error('Erreur lors du chargement de la progression:', err);
      // Ne pas afficher d'erreur si l'élève n'a pas encore de progression
      if (err.response && err.response.status !== 404) {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger la progression',
          color: 'red'
        });
      }
    }
  };

  // Démarrer un quiz
  const startQuiz = async (quizId) => {
    if (!studentInfo.id || !studentInfo.name) {
      notifications.show({
        title: 'Information manquante',
        message: 'Veuillez entrer votre identifiant et votre nom',
        color: 'red'
      });
      return;
    }

    setLoading(true);
    try {
      // Charger les détails du quiz si pas déjà chargés
      if (!currentQuiz || currentQuiz.id !== quizId) {
        await loadQuizDetails(quizId);
      }
      
      // Créer une nouvelle tentative
      const formData = new FormData();
      formData.append('quiz_id', quizId);
      formData.append('student_id', studentInfo.id);
      formData.append('student_name', studentInfo.name);
      
      const response = await axios.post(`${API_BASE_URL}/quizzes/attempts/start`, formData);
      
      setCurrentAttempt(response.data);
      setQuizInProgress(true);
      setCurrentQuestionIndex(0);
      setAnswers(Array(currentQuiz.questions.length).fill(-1));
      setCurrentAnswer(null);
      
      // Charger la progression de l'élève
      loadStudentProgress(studentInfo.id);
      
    } catch (err) {
      setError(`Erreur lors du démarrage du quiz: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Soumettre une réponse et vérifier si elle est correcte avant de passer à la question suivante
  const submitAnswer = () => {
    // Si aucune réponse n'est sélectionnée, utiliser -1 (question sautée)
    const answerToSubmit = currentAnswer !== null ? currentAnswer : -1;
    
    // Mettre à jour le tableau des réponses
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerToSubmit;
    setAnswers(newAnswers);
    
    // Vérifier si la réponse est correcte et afficher les résultats
    if (answerToSubmit !== -1) {
      const currentQuestion = currentQuiz.questions[currentQuestionIndex];
      const isCorrect = answerToSubmit === currentQuestion.correct_answer;
      setIsCorrectAnswer(isCorrect);
      setCurrentExplanation(currentQuestion.explanation || "Pas d'explication disponible");
      setShowAnswerFeedback(true);
    } else {
      // Si la question est sautée, passer directement à la suivante
      goToNextQuestion(newAnswers);
    }
  };
  
  // Fonction pour passer à la question suivante après le feedback
  const goToNextQuestion = (newAnswers) => {
    // Réinitialiser les états de feedback
    setShowAnswerFeedback(false);
    setCurrentAnswer(null);
    
    // Passer à la question suivante ou terminer le quiz
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Si c'était la dernière question, soumettre le quiz
      submitQuiz(newAnswers);
    }
  };

  // Soumettre le quiz complet
  const submitQuiz = async (finalAnswers) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/quizzes/attempts/${currentAttempt.attempt_id}/submit`,
        finalAnswers
      );
      
      setQuizResults(response.data.result);
      setQuizInProgress(false);
      
      // Rafraîchir la progression de l'élève
      loadStudentProgress(studentInfo.id);
      
    } catch (err) {
      setError(`Erreur lors de la soumission du quiz: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Générer un nouveau quiz
  const generateQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/quizzes/generate`, generatorForm);
      
      // Fermer le modal et afficher une notification de succès
      closeGenerator();
      
      notifications.show({
        title: 'Quiz généré avec succès',
        message: 'Le nouveau quiz est maintenant disponible',
        color: 'green'
      });
      
      // Rafraîchir la liste des quiz
      loadQuizzes();
      
      // Réinitialiser le formulaire
      setGeneratorForm({
        subject: '',
        grade_level: '',
        topic: '',
        difficulty: 'medium',
        question_count: 10,
        rag_collection: null
      });
      
    } catch (err) {
      setError(`Erreur lors de la génération du quiz: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Recommencer un quiz
  const restartQuiz = () => {
    setQuizResults(null);
    setCurrentQuestionIndex(0);
    setAnswers(Array(currentQuiz.questions.length).fill(-1));
    setCurrentAnswer(null);
    setQuizInProgress(true);
  };

  // Retour à la liste des quiz
  const backToQuizzes = () => {
    setCurrentQuiz(null);
    setQuizInProgress(false);
    setQuizResults(null);
    setCurrentAttempt(null);
  };

  // Charger un quiz spécifique
  const viewQuiz = (quizId) => {
    loadQuizDetails(quizId);
  };

  // Formater le niveau de difficulté pour l'affichage
  const formatDifficulty = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return difficulty;
    }
  };

  // Obtenir la couleur pour le niveau de difficulté
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'blue';
      case 'hard': return 'red';
      default: return 'gray';
    }
  };

  // Obtenir la couleur pour le score
  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  // Rendu des onglets
  const renderTabs = () => (
    <Tabs 
      value={activeTab} 
      onChange={setActiveTab}
      mb="xl"
    >
      <Tabs.List grow>
        <Tabs.Tab 
          value="explorer" 
          leftSection={<IconListCheck size={16} />}
        >
          Explorer les Quiz
        </Tabs.Tab>
        <Tabs.Tab 
          value="progress" 
          leftSection={<IconChartBar size={16} />}
        >
          Suivi de Progression
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );

  // Rendu de l'explorateur de quiz
  const renderQuizExplorer = () => (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Explorer les Quiz</Title>
        <Button 
          leftSection={<IconPlus size={16} />} 
          onClick={openGenerator}
        >
          Créer un Quiz
        </Button>
      </Group>

      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Select
            label="Matière"
            placeholder="Toutes les matières"
            data={subjects.map(s => ({ value: s, label: s }))}
            value={filterSubject}
            onChange={setFilterSubject}
            clearable
            mb="md"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Select
            label="Niveau"
            placeholder="Tous les niveaux"
            data={gradeLevels.map(g => ({ value: g, label: g }))}
            value={filterGradeLevel}
            onChange={setFilterGradeLevel}
            clearable
            mb="md"
          />
        </Grid.Col>
      </Grid>

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <Card key={i} withBorder mb="md" padding="lg">
              <Skeleton height={20} width="70%" mb="sm" />
              <Skeleton height={15} width="40%" mb="sm" />
              <Skeleton height={15} width="90%" mb="sm" />
              <Group mt="md">
                <Skeleton height={20} width={80} radius="xl" />
                <Skeleton height={20} width={80} radius="xl" />
              </Group>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert color="red" title="Erreur">
          {error}
        </Alert>
      ) : quizzes.length === 0 ? (
        <Alert color="blue" title="Aucun quiz disponible">
          Aucun quiz ne correspond à vos critères. Essayez de modifier les filtres ou créez un nouveau quiz.
        </Alert>
      ) : (
        <div>
          {quizzes.map(quiz => (
            <Card key={quiz.id} withBorder mb="md" padding="lg">
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="lg">{quiz.title}</Text>
                <Badge color={getDifficultyColor(quiz.difficulty)}>
                  {formatDifficulty(quiz.difficulty)}
                </Badge>
              </Group>
              <Text color="dimmed" size="sm" mb="md">
                {quiz.description}
              </Text>
              <Group mb="md">
                <Badge color="blue">{quiz.subject}</Badge>
                <Badge color="teal">{quiz.grade_level}</Badge>
                <Badge color="grape">{quiz.question_count} questions</Badge>
                <Badge color="orange">{quiz.duration_minutes} min</Badge>
              </Group>
              <Group position="apart">
                <Button onClick={() => viewQuiz(quiz.id)}>
                  Voir le Quiz
                </Button>
                <Button 
                  color="red" 
                  variant="subtle" 
                  leftSection={<IconTrash size={16} />}
                  onClick={() => deleteQuiz(quiz.id)}
                >
                  Supprimer
                </Button>
              </Group>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  // Rendu du suivi de progression
  const renderProgressSection = () => (
    <>
      <Title order={2} mb="md">Suivi de Progression</Title>
      
      <Paper p="md" withBorder mb="xl">
        <Group mb="md">
          <TextInput
            label="Identifiant de l'élève"
            placeholder="Entrez votre identifiant"
            value={studentInfo.id}
            onChange={(e) => setStudentInfo({ ...studentInfo, id: e.target.value })}
            style={{ flex: 1 }}
          />
          <TextInput
            label="Nom de l'élève"
            placeholder="Entrez votre nom"
            value={studentInfo.name}
            onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
            style={{ flex: 2 }}
          />
          <Button 
            onClick={() => loadStudentProgress(studentInfo.id)}
            mt={24}
            disabled={!studentInfo.id}
          >
            Charger la progression
          </Button>
        </Group>
      </Paper>

      {studentProgress ? (
        <div>
          <Card withBorder mb="xl" p="md">
            <Group position="apart">
              <div>
                <Text fw={700} size="xl">{studentProgress.student_name}</Text>
                <Text color="dimmed">ID: {studentProgress.student_id}</Text>
              </div>
              <div>
                <Text align="center" fw={700} size="xl">
                  {studentProgress.average_score.toFixed(1)}%
                </Text>
                <Text align="center" color="dimmed">Score moyen</Text>
              </div>
            </Group>
            
            <Progress
              value={studentProgress.average_score}
              color={getScoreColor(studentProgress.average_score)}
              size="lg"
              radius="xl"
              mt="md"
              mb="md"
            />
            
            <Text fw={500} mb="xs">Quiz complétés: {studentProgress.quizzes_taken}</Text>
            
            <Accordion mt="lg">
              <Accordion.Item value="strengths">
                <Accordion.Control>
                  <Group>
                    <IconTrophy color={theme.colors.green[6]} />
                    <Text>Points forts</Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <List>
                    {studentProgress.strengths && studentProgress.strengths.length > 0 ? (
                      studentProgress.strengths.map((strength, index) => (
                        <List.Item key={index}>
                          <Text>{strength}</Text>
                        </List.Item>
                      ))
                    ) : (
                      <Text color="dimmed">Pas encore de points forts identifiés</Text>
                    )}
                  </List>
                </Accordion.Panel>
              </Accordion.Item>
              
              <Accordion.Item value="weaknesses">
                <Accordion.Control>
                  <Group>
                    <IconAlertCircle color={theme.colors.orange[6]} />
                    <Text>Points à améliorer</Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <List>
                    {studentProgress.weaknesses && studentProgress.weaknesses.length > 0 ? (
                      studentProgress.weaknesses.map((weakness, index) => (
                        <List.Item key={index}>
                          <Text>{weakness}</Text>
                        </List.Item>
                      ))
                    ) : (
                      <Text color="dimmed">Pas encore de points faibles identifiés</Text>
                    )}
                  </List>
                </Accordion.Panel>
              </Accordion.Item>
              
              <Accordion.Item value="recommendations">
                <Accordion.Control>
                  <Group>
                    <IconSchool color={theme.colors.blue[6]} />
                    <Text>Recommandations</Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  {studentProgress.improvement_areas && studentProgress.improvement_areas.length > 0 ? (
                    studentProgress.improvement_areas.map((area, index) => (
                      <Paper key={index} p="sm" withBorder mb="sm">
                        <Text fw={500}>{area.topic}</Text>
                        <Text size="sm" color="dimmed">{area.description}</Text>
                      </Paper>
                    ))
                  ) : (
                    <Text color="dimmed">Pas encore de recommandations disponibles</Text>
                  )}
                  
                  {studentProgress.recommended_quizzes && studentProgress.recommended_quizzes.length > 0 && (
                    <>
                      <Text fw={500} mt="md" mb="xs">Quiz recommandés:</Text>
                      <Group>
                        {studentProgress.recommended_quizzes.map((quizId, index) => {
                          const quiz = quizzes.find(q => q.id === quizId);
                          return quiz ? (
                            <Badge 
                              key={index} 
                              size="lg" 
                              color="blue" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => viewQuiz(quizId)}
                            >
                              {quiz.title}
                            </Badge>
                          ) : null;
                        })}
                      </Group>
                    </>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Card>
          
          <Title order={3} mb="md">Performance par matière</Title>
          {Object.entries(studentProgress.subject_performance).map(([subject, score]) => (
            <Paper key={subject} p="md" withBorder mb="md">
              <Group position="apart" mb="xs">
                <Text fw={500}>{subject}</Text>
                <Text fw={700} color={getScoreColor(score)}>
                  {score.toFixed(1)}%
                </Text>
              </Group>
              <Progress
                value={score}
                color={getScoreColor(score)}
                size="md"
                radius="xl"
              />
            </Paper>
          ))}
        </div>
      ) : (
        <Alert color="blue" title="Aucune donnée de progression">
          Entrez votre identifiant et chargez votre progression, ou commencez à faire des quiz pour générer des données de progression.
        </Alert>
      )}
    </>
  );

  // Rendu de la page détaillée du quiz
  const renderQuizDetails = () => {
    if (loading) {
      return (
        <div>
          <Skeleton height={30} width="70%" mb="lg" />
          <Skeleton height={20} width="50%" mb="md" />
          <Skeleton height={15} width="90%" mb="lg" />
          
          {[1, 2, 3].map(i => (
            <Card key={i} withBorder mb="md" padding="md">
              <Skeleton height={20} width="90%" mb="sm" />
              <Group mt="md">
                <Skeleton height={15} width="40%" />
                <Skeleton height={15} width="40%" />
              </Group>
            </Card>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert color="red" title="Erreur">
          {error}
          <Button variant="outline" onClick={backToQuizzes} mt="md">
            Retour aux quiz
          </Button>
        </Alert>
      );
    }

    if (!currentQuiz) return null;

    return (
      <div>
        <Button variant="outline" onClick={backToQuizzes} mb="md">
          ← Retour aux quiz
        </Button>
        
        <Title order={2} mb="xs">{currentQuiz.title}</Title>
        <Group mb="md">
          <Badge color="blue">{currentQuiz.subject}</Badge>
          <Badge color="teal">{currentQuiz.grade_level}</Badge>
          <Badge color={getDifficultyColor(currentQuiz.difficulty)}>
            {formatDifficulty(currentQuiz.difficulty)}
          </Badge>
          <Badge color="grape">{currentQuiz.questions.length} questions</Badge>
          <Badge color="orange">{currentQuiz.duration_minutes} min</Badge>
        </Group>
        <Text mb="lg">{currentQuiz.description}</Text>
        
        <Paper p="lg" withBorder mb="xl">
          <Group mb="md">
            <TextInput
              label="Identifiant de l'élève"
              placeholder="Entrez votre identifiant"
              value={studentInfo.id}
              onChange={(e) => setStudentInfo({ ...studentInfo, id: e.target.value })}
              style={{ flex: 1 }}
              required
            />
            <TextInput
              label="Nom de l'élève"
              placeholder="Entrez votre nom"
              value={studentInfo.name}
              onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
              style={{ flex: 2 }}
              required
            />
          </Group>
          <Button 
            onClick={() => startQuiz(currentQuiz.id)}
            fullWidth
            size="md"
            disabled={!studentInfo.id || !studentInfo.name}
          >
            Commencer le Quiz
          </Button>
        </Paper>
        
        <Title order={3} mb="md">Aperçu des questions</Title>
        <Text color="dimmed" mb="lg">
          Ce quiz contient {currentQuiz.questions.length} questions. Voici un aperçu des questions:
        </Text>
        
        {currentQuiz.questions.map((question, index) => (
          <Card key={index} withBorder mb="md" padding="md">
            <Text fw={500}>Question {index + 1}: {question.question}</Text>
            <Group mt="xs">
              {question.tags.map((tag, i) => (
                <Badge key={i} size="sm">{tag}</Badge>
              ))}
            </Group>
          </Card>
        ))}
      </div>
    );
  };

  // Rendu de l'interface de quiz en cours
  const renderQuizInProgress = () => {
    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
      return <Alert color="red">Erreur: Questions non disponibles</Alert>;
    }

    const question = currentQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;

    return (
      <div>
        <Group position="apart" mb="xl">
          <Text>Question {currentQuestionIndex + 1} sur {currentQuiz.questions.length}</Text>
          <Badge>{currentQuiz.subject} - {currentQuiz.grade_level}</Badge>
        </Group>
        
        <Progress
          value={progress}
          color="blue"
          size="lg"
          radius="xl"
          mb="xl"
        />
        
        <Paper p="lg" withBorder mb="xl">
          <Title order={3} mb="lg">{question.question}</Title>
          
          <Radio.Group
            value={currentAnswer !== null ? currentAnswer.toString() : null}
            onChange={(val) => setCurrentAnswer(parseInt(val))}
            mb="xl"
            disabled={showAnswerFeedback}
          >
            <Stack>
              {question.options.map((option, idx) => (
                <Radio 
                  key={idx} 
                  value={idx.toString()} 
                  label={option}
                  styles={showAnswerFeedback ? {
                    radio: {
                      backgroundColor: 
                        idx === question.correct_answer ? theme.colors.green[1] :
                        (idx === currentAnswer && currentAnswer !== question.correct_answer) ? theme.colors.red[1] : '',
                      borderColor: 
                        idx === question.correct_answer ? theme.colors.green[6] :
                        (idx === currentAnswer && currentAnswer !== question.correct_answer) ? theme.colors.red[6] : ''
                    },
                    label: {
                      color: 
                        idx === question.correct_answer ? theme.colors.green[8] :
                        (idx === currentAnswer && currentAnswer !== question.correct_answer) ? theme.colors.red[8] : ''
                    }
                  } : {}}
                />
              ))}
            </Stack>
          </Radio.Group>
          
          {showAnswerFeedback && (
            <Paper p="md" withBorder mb="xl" bg={isCorrectAnswer ? theme.colors.green[0] : theme.colors.red[0]}>
              <Title order={4} mb="md" color={isCorrectAnswer ? "green" : "red"}>
                {isCorrectAnswer ? "Bonne réponse !" : "Réponse incorrecte"}
              </Title>
              <Text mb="md">{currentExplanation}</Text>
            </Paper>
          )}
          
          <Group position="apart" mt="xl">
            {showAnswerFeedback ? (
              <Button 
                color={isCorrectAnswer ? "green" : "blue"} 
                onClick={() => goToNextQuestion(answers)}
              >
                {currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Question suivante' : 'Terminer le quiz'}
              </Button>
            ) : (
              <Button variant="outline" onClick={submitAnswer}>
                Vérifier ma réponse
              </Button>
            )}
          </Group>
        </Paper>
      </div>
    );
  };

  // Rendu des résultats du quiz
  const renderQuizResults = () => {
    if (!quizResults) return null;

    return (
      <div>
        <Title order={2} mb="md">Résultats du Quiz</Title>
        
        <Card withBorder mb="xl" p="md">
          <Group position="apart">
            <div>
              <Text fw={700} size="xl">{quizResults.student_name}</Text>
              <Text color="dimmed">Quiz: {currentQuiz.title}</Text>
            </div>
            <div>
              <Text align="center" fw={700} size="xl" color={getScoreColor(quizResults.score)}>
                {quizResults.score.toFixed(1)}%
              </Text>
              <Text align="center" color="dimmed">Score</Text>
            </div>
          </Group>
          
          <Progress
            value={quizResults.score}
            color={getScoreColor(quizResults.score)}
            size="lg"
            radius="xl"
            mt="md"
            mb="md"
          />
          
          <Group grow mb="md">
            <Paper p="md" withBorder>
              <Text align="center" fw={700} size="xl" color="green">
                {quizResults.correct_answers}
              </Text>
              <Text align="center" color="dimmed">Bonnes réponses</Text>
            </Paper>
            
            <Paper p="md" withBorder>
              <Text align="center" fw={700} size="xl" color="red">
                {quizResults.incorrect_answers}
              </Text>
              <Text align="center" color="dimmed">Mauvaises réponses</Text>
            </Paper>
            
            <Paper p="md" withBorder>
              <Text align="center" fw={700} size="xl" color="gray">
                {quizResults.skipped_questions}
              </Text>
              <Text align="center" color="dimmed">Questions sautées</Text>
            </Paper>
          </Group>
          
          <Group position="apart" mt="xl">
            <Button variant="outline" onClick={backToQuizzes}>
              Retour aux quiz
            </Button>
            <Button onClick={restartQuiz}>
              Refaire le quiz
            </Button>
          </Group>
        </Card>
        
        <Accordion>
          <Accordion.Item value="strengths">
            <Accordion.Control>
              <Group>
                <IconCheckbox color={theme.colors.green[6]} />
                <Text>Points forts identifiés</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {quizResults.strengths.length > 0 ? (
                <List>
                  {quizResults.strengths.map((strength, index) => (
                    <List.Item key={index}>
                      <Text>{strength}</Text>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text color="dimmed">Aucun point fort identifié</Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
          
          <Accordion.Item value="weaknesses">
            <Accordion.Control>
              <Group>
                <IconAlertCircle color={theme.colors.red[6]} />
                <Text>Points à améliorer</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {quizResults.weaknesses.length > 0 ? (
                <List>
                  {quizResults.weaknesses.map((weakness, index) => (
                    <List.Item key={index}>
                      <Text>{weakness}</Text>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text color="dimmed">Aucun point à améliorer identifié</Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
          
          <Accordion.Item value="recommendations">
            <Accordion.Control>
              <Group>
                <IconSchool color={theme.colors.blue[6]} />
                <Text>Recommandations</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {quizResults.recommendations.length > 0 ? (
                quizResults.recommendations.map((rec, index) => (
                  <Paper key={index} p="md" withBorder mb="md">
                    <Text fw={700}>{rec.topic}</Text>
                    <Text color="dimmed" mb="md">{rec.description}</Text>
                    
                    {rec.suggested_quizzes.length > 0 && (
                      <>
                        <Text fw={500} mb="xs">Quiz recommandés:</Text>
                        <Group mb="md">
                          {rec.suggested_quizzes.map((quiz, i) => (
                            <Badge 
                              key={i} 
                              size="lg" 
                              color="blue" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => viewQuiz(quiz.id)}
                            >
                              {quiz.title}
                            </Badge>
                          ))}
                        </Group>
                      </>
                    )}
                    
                    {rec.resources.length > 0 && (
                      <>
                        <Text fw={500} mb="xs">Ressources:</Text>
                        <List>
                          {rec.resources.map((resource, i) => (
                            <List.Item key={i}>
                              <Text fw={500}>{resource.title}</Text>
                              <Text size="sm">{resource.description}</Text>
                            </List.Item>
                          ))}
                        </List>
                      </>
                    )}
                  </Paper>
                ))
              ) : (
                <Text color="dimmed">Aucune recommandation disponible</Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    );
  };

  // Rendu du modal de génération de quiz
  const renderGeneratorModal = () => (
    <Modal 
      opened={openGeneratorModal}
      onClose={closeGenerator}
      title="Générer un nouveau quiz"
      size="lg"
    >
      <Box>
        <TextInput
          label="Matière"
          placeholder="Ex: Mathématiques, Français, Histoire..."
          value={generatorForm.subject}
          onChange={(e) => setGeneratorForm({ ...generatorForm, subject: e.target.value })}
          required
          mb="md"
        />
        
        <TextInput
          label="Niveau scolaire"
          placeholder="Ex: 6ème, 5ème, 4ème, 3ème, Seconde..."
          value={generatorForm.grade_level}
          onChange={(e) => setGeneratorForm({ ...generatorForm, grade_level: e.target.value })}
          required
          mb="md"
        />
        
        <TextInput
          label="Thème du quiz"
          placeholder="Ex: Fractions, Conjugaison, Révolution française..."
          value={generatorForm.topic}
          onChange={(e) => setGeneratorForm({ ...generatorForm, topic: e.target.value })}
          required
          mb="md"
        />
        
        <Select
          label="Difficulté"
          data={[
            { value: 'easy', label: 'Facile' },
            { value: 'medium', label: 'Moyen' },
            { value: 'hard', label: 'Difficile' }
          ]}
          value={generatorForm.difficulty}
          onChange={(val) => setGeneratorForm({ ...generatorForm, difficulty: val })}
          mb="md"
        />
        
        <NumberInput
          label="Nombre de questions"
          min={5}
          max={20}
          value={generatorForm.question_count}
          onChange={(val) => setGeneratorForm({ ...generatorForm, question_count: val })}
          mb="md"
        />
        
        <Select
          label="Collection RAG (optionnel)"
          description="Utiliser une base de connaissances pour générer des questions plus précises"
          placeholder="Sélectionner une collection..."
          data={collections.map(c => ({ value: c.name, label: c.name }))}
          value={generatorForm.rag_collection}
          onChange={(val) => setGeneratorForm({ ...generatorForm, rag_collection: val })}
          clearable
          mb="md"
        />
        
        <Group position="right" mt="xl">
          <Button variant="outline" onClick={closeGenerator}>
            Annuler
          </Button>
          <Button 
            onClick={generateQuiz}
            disabled={!generatorForm.subject || !generatorForm.grade_level || !generatorForm.topic}
            loading={loading}
          >
            Générer
          </Button>
        </Group>
      </Box>
    </Modal>
  );

  const deleteQuiz = async (quizId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        notifications.show({
          title: 'Succès',
          message: 'Le quiz a été supprimé avec succès',
          color: 'green',
        });
        loadQuizzes(filterSubject, filterGradeLevel);
      } else {
        const errorData = await response.json();
        notifications.show({
          title: 'Erreur',
          message: `Échec de la suppression: ${errorData.detail || 'Erreur inconnue'}`,
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du quiz:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la suppression du quiz',
        color: 'red',
      });
    }
  };

  return (
    <Container size="lg">
      <Title order={1} mb="lg" align="center">
        <IconSchool size={32} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
        Turbo Quiz
      </Title>
      
      {!currentQuiz && renderTabs()}
      
      {currentQuiz && !quizInProgress && !quizResults && renderQuizDetails()}
      {quizInProgress && renderQuizInProgress()}
      {quizResults && renderQuizResults()}
      
      {!currentQuiz && activeTab === 'explorer' && renderQuizExplorer()}
      {!currentQuiz && activeTab === 'progress' && renderProgressSection()}
      
      {renderGeneratorModal()}
    </Container>
  );
};

export default TurboQuizz; 