import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET;

  return {
    // Where the dashboard is served from, e.g. "/dashboard/" when it lives
    // under the public site's domain. Must start and end with "/".
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Dev only: forward /api and /smartboard to backend
      proxy: {
        '/api': { target: proxyTarget || 'http://localhost:5000', changeOrigin: true },
        '/smartboard': { target: proxyTarget || 'http://localhost:5000', changeOrigin: true },
        '/smart-board': { target: proxyTarget || 'http://localhost:5000', changeOrigin: true },
      },
    },
    preview: { port: 4173, strictPort: true },
    build: { sourcemap: mode !== 'production' },
  };
});
