import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from '@mandaapp/ui/src/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { initSyncListeners } from './lib/syncEngine';

// Initialize offline sync engine — listens for online/offline events
initSyncListeners();

// Global handler: auto-reload on chunk load failures (after new deployment)
// Only when online — offline chunk failures are handled by ErrorBoundary
window.addEventListener('unhandledrejection', (event) => {
  if (!navigator.onLine) return; // Don't reload when offline
  const msg = (event.reason?.message || '').toLowerCase();
  // Only match specific chunk/module loading errors, NOT general "failed to fetch"
  if (
    msg.includes('dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk')
  ) {
    const key = 'simanda_chunk_reload';
    const last = sessionStorage.getItem(key);
    if (!last || Date.now() - parseInt(last) > 30000) {
      sessionStorage.setItem(key, Date.now().toString());
      window.location.reload();
    }
  }
});

// Listen for SW background sync completion
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_COMPLETE' && event.data.synced > 0) {
      // Use native notification if available, otherwise console
      console.log(`[Sync] ${event.data.synced} data berhasil disinkronkan`);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, 
      refetchOnWindowFocus: false, 
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="mandalotim-theme">
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
