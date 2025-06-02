import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Burger, Group, NavLink, Text, Title, Button, Box, ActionIcon, Tooltip, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMessage, IconSettings, IconHistory, IconChartBar, IconDatabase, IconBook, IconFolder, IconChevronLeft, IconChevronRight, IconMenu2, IconSchool } from '@tabler/icons-react';
import { useModel } from './contexts/ModelContext';
import { useViewportSize } from '@mantine/hooks';

// Pages
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import History from './pages/History';
import TokenUsage from './pages/TokenUsage';
import RagManager from './pages/RagManager';
import RagDocumentation from './pages/RagDocumentation';
import SavedConversations from './pages/SavedConversations';
import TurboQuizz from './pages/TurboQuizz';

function App() {
  const [opened, { toggle }] = useDisclosure();
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const location = useLocation();
  const { getModelStatus } = useModel();
  const modelStatus = getModelStatus();
  const { width } = useViewportSize();
  const isMobile = width < 768;

  const toggleMenu = () => {
    setMenuCollapsed(prev => !prev);
  };

  // Liens du menu
  const links = [
    { to: '/', label: 'Discussion', icon: <IconMessage size={20} />, hide: false },
    { to: '/history', label: 'Historique', icon: <IconHistory size={20} />, hide: false },
    { to: '/saved', label: 'Conversations Sauvegardées', icon: <IconFolder size={20} />, hide: false },
    { to: '/rag', label: 'Base de Connaissances', icon: <IconDatabase size={20} />, hide: false },
    { to: '/rag-documentation', label: 'Documentation RAG', icon: <IconBook size={20} />, hide: false },
    { to: '/tokens', label: 'Utilisation Tokens', icon: <IconChartBar size={20} />, hide: false },
    { to: '/quizz', label: 'Turbo Quizz', icon: <IconSchool size={20} />, hide: false },
    { to: '/settings', label: 'Paramètres', icon: <IconSettings size={20} />, hide: false }
  ];

  // Filtrer les liens en fonction du type de modèle
  const visibleLinks = links.filter(link => !link.hide);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      {/* En-tête */}
      <div style={{ 
        height: '60px', 
        borderBottom: '1px solid #e9ecef', 
        padding: '0 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'white',
        zIndex: 100,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0
      }}>
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
            style={{ display: isMobile ? 'block' : 'none' }}
            />
            <Group justify="space-between" mb="md">
              <Title order={3} c="blue.6">TurboChat</Title>
            </Group>
          </Group>
          <Group>
          <Text size="sm" c={modelStatus.color + '.6'} fw={500}>
            {modelStatus.label}
            </Text>
          <ActionIcon 
            variant="filled" 
            color="blue" 
            onClick={toggleMenu} 
            title={menuCollapsed ? "Déplier le menu" : "Replier le menu"}
            style={{ display: isMobile ? 'none' : 'flex' }}
          >
            {menuCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
          </ActionIcon>
        </Group>
      </div>

      {/* Zone de contenu avec menu */}
      <div style={{ 
        display: 'flex', 
        marginTop: '60px', 
        height: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>
        {/* Menu latéral */}
        <div style={{ 
          width: menuCollapsed ? '80px' : '300px', 
          transition: 'width 0.3s ease',
          borderRight: '1px solid #e9ecef',
          padding: '16px',
          background: 'white',
          display: (isMobile && !opened) ? 'none' : 'block',
          height: '100%',
          overflowY: 'auto',
          position: 'relative'
        }}>
          <Title order={4} mb="md" c="dimmed" style={{ display: menuCollapsed ? 'none' : 'block' }}>Menu</Title>

          {/* Bouton de pliage sur le bord du menu */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              right: -15, 
              transform: 'translateY(-50%)', 
              zIndex: 1000,
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
              backgroundColor: '#1c7ed6',
              color: 'white',
              border: `1px solid #1c7ed6`,
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={toggleMenu}
            title={menuCollapsed ? "Déplier le menu" : "Replier le menu"}
          >
            {menuCollapsed ? <IconChevronRight size={16} color="white" /> : <IconChevronLeft size={16} color="white" />}
          </div>

          {visibleLinks.map((link) => (
            <Tooltip 
              key={link.to}
              label={link.label} 
              position="right" 
              disabled={!menuCollapsed}
              withArrow
            >
              <NavLink
                component={Link}
                to={link.to}
                label={menuCollapsed ? null : link.label}
                leftSection={link.icon}
                active={location.pathname === link.to}
            mb="xs"
                style={{ 
                  justifyContent: menuCollapsed ? 'center' : 'flex-start',
                  padding: menuCollapsed ? '8px 0' : undefined
                }}
          />
            </Tooltip>
        ))}
        
          {!menuCollapsed && (
            <>
              <Box mt="auto" pt="xl">
                <Group spacing="xs" align="center">
                  <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>CE</Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                    TurboChat ne garantit pas l'exactitude des informations fournies.
        </Text>
                </Group>
              </Box>
            </>
          )}
        </div>

        {/* Contenu principal */}
        <div style={{ 
          flex: 1, 
          padding: '16px',
          overflowY: 'auto',
          background: '#f8f9fa'
        }}>
        <Routes>
          <Route path="/" element={<Chat />} />
            <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<History />} />
            <Route path="/tokens" element={<TokenUsage />} />
            <Route path="/rag" element={<RagManager />} />
            <Route path="/rag-documentation" element={<RagDocumentation />} />
            <Route path="/saved" element={<SavedConversations />} />
            <Route path="/quizz" element={<TurboQuizz />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </div>
    </div>
  );
}

export default App; 