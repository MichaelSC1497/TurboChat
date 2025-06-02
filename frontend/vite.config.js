import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/rag': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/status': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/system-stats': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api-models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/set-api-key': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
}); 