import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8020,
    host: true,
    open: true,
    allowedHosts: [
      'regulatory-hqeeh0gha3areghh.southindia-01.azurewebsites.net',
      'regulatoryai-dev.bialairport.com',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
