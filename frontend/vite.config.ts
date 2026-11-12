import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://nginx';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Poll inside the Docker container so Windows bind-mount edits trigger HMR reliably.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: false,
      },
      '/sanctum': {
        target: apiProxyTarget,
        changeOrigin: false,
      },
      '/up': {
        target: apiProxyTarget,
        changeOrigin: false,
      },
      '/storage': {
        target: apiProxyTarget,
        changeOrigin: false,
      },
    },
  },
});
