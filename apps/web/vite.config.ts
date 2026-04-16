import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    modulePreload: false,
    assetsDir: '', // Output assets directly to root, bypassing extraction bugs
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
          utils: ['axios', 'better-auth'],
          query: ['@tanstack/react-query'],
          heavy1: ['jspdf', 'html2canvas', 'xlsx'],
          heavy2: ['quill', 'react-quill', 'jodit-react', 'react-image-crop'],
          qr: ['qrcode']
        }
      }
    }
  },
});
