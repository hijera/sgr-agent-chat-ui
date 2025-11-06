import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      },
      '/agents': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8010',
        changeOrigin: true,
      },
    },
  },
});


