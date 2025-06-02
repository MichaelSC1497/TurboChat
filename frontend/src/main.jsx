import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import { Notifications } from '@mantine/notifications';
import App from './App';
import { ConversationProvider } from './contexts/ConversationContext';
import { ModelProvider } from './contexts/ModelContext';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';

// Configuration du proxy API pour le développement
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Configuration du thème Mantine
const theme = {
        fontFamily: 'Poppins, sans-serif',
        primaryColor: 'blue',
        defaultRadius: 'md',
        colors: {
          blue: [
            '#E6F7FF', // 0
            '#BAE7FF', // 1
            '#91D5FF', // 2
            '#69C0FF', // 3
            '#40A9FF', // 4
            '#1890FF', // 5
            '#096DD9', // 6
            '#0050B3', // 7
            '#003A8C', // 8
            '#002766', // 9
          ],
        },
  components: {
    Tabs: {
      styles: {
        tab: {
          '&[data-active]': {
            fontWeight: 600,
          },
        },
      },
    },
    NavLink: {
      styles: {
        root: {
          '&[data-active]': {
            fontWeight: 600,
          },
        },
      },
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <BrowserRouter>
        <ModelProvider>
          <ConversationProvider>
            <App />
          </ConversationProvider>
        </ModelProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
); 