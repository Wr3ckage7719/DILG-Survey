import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Server-side env (never shipped to the browser). ADMIN_GS_SECRET is read by
  // the dev proxy so /api/admin calls reach the Apps Script with the shared
  // secret, just like the Vercel function does in production.
  const env = loadEnv(mode, process.cwd(), '');
  const APPS_SCRIPT_URL = env.APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL;
  const ADMIN_GS_SECRET = env.ADMIN_GS_SECRET || process.env.ADMIN_GS_SECRET || '';

  return {
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
          rewrite: (p) => {
            if (p.startsWith('/api/submit')) return p.replace(/^\/api\/submit/, '');
            if (p === '/api/admin/login') return `?action=login&secret=${encodeURIComponent(ADMIN_GS_SECRET)}`;
            if (p === '/api/admin/responses') return `?action=responses&secret=${encodeURIComponent(ADMIN_GS_SECRET)}`;
            if (p === '/api/admin/print') return `?action=print&secret=${encodeURIComponent(ADMIN_GS_SECRET)}`;
            return p;
          },
        },
      },
    },
  };
});
