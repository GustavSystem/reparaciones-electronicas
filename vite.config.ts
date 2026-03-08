import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', // <--- CRÍTICO: Esto arregla el error 404 en GitHub Pages
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve('src')
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    server: {
      host: true
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    }
  };
});