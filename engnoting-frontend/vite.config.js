import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://engnoting-backend-private-production.up.railway.app',
      '/admin': 'https://engnoting-backend-private-production.up.railway.app',
      '/health': 'https://engnoting-backend-private-production.up.railway.app',
    },
  },
});
