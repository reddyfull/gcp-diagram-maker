import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'session-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          console.log('Request URL:', req.url);
          
          if (req.url && req.url.includes('session_')) {
            console.log('Intercepting session URL:', req.url);
            
            // Serve the direct session viewer HTML
            const sessionHtml = fs.readFileSync(
              path.resolve(__dirname, 'public/direct/session.html'),
              'utf-8'
            );
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(sessionHtml);
            return;
          }
          
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
