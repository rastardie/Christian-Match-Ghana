import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: env.VITE_BASE_PATH || '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
                secure: false,
            }
        }
      },
      publicDir: 'public', // Ensures .htaccess and _redirects are copied
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('/src/components/')) {
                return 'components';
              }
              if (id.includes('/src/services/')) {
                return 'services';
              }
              if (id.includes('/node_modules/firebase/')) {
                const packageName = id.split('/node_modules/firebase/')[1]?.split('/')[0];
                return packageName ? `firebase-${packageName}` : 'firebase';
              }
              if (id.includes('/node_modules/lucide-react/')) {
                return 'icons';
              }
              return undefined;
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),

      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
