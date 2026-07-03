import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': 'http://localhost:4700',
      '/media': 'http://localhost:4700',
      '/ws': { target: 'ws://localhost:4700', ws: true }
    }
  }
});
