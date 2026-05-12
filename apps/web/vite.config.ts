import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // We handle registration manually in index.html
      includeAssets: [
        'pwa-icon-192x192.png',
        'pwa-icon-512x512.png', 
        'pwa-icon-180x180.png',
        'hero-building.webp',
        'Gambar Langit manda.webp',
        'manifest.json',
      ],
      manifest: false, // We already have manifest.json in public/
      devOptions: {
        enabled: false, // SW disabled in dev to avoid caching issues
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    modulePreload: false,
    cssCodeSplit: true,
    assetsDir: '',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
          utils: ['axios', 'better-auth'],
          query: ['@tanstack/react-query'],
          heavy1: ['jspdf', 'html2canvas', 'xlsx'],
          heavy2: ['quill', 'react-quill', 'jodit-react', 'react-image-crop'],
          qr: ['qrcode'],
        }
      }
    }
  },
});
