import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/upload': 'http://localhost:3000',
      '/delete': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/widgets': 'http://localhost:3000',
      '/rotation': 'http://localhost:3000',
      '/devises': 'http://localhost:3000',
      '/logo': 'http://localhost:3000',
      '/widget-schemas': 'http://localhost:3000',
    },
  },
});
