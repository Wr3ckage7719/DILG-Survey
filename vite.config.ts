import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      // In dev, proxy /api/* to the real Google Apps Script endpoint
      // This keeps the script URL server-side even during development
      '/api': {
        target: APPS_SCRIPT_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/submit/, ''),
      },
    },
  },
});
