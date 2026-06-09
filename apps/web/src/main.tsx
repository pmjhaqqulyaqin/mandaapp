import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from '@mandaapp/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { initSyncListeners } from './lib/syncEngine';

// Initialize offline sync engine — listens for online/offline events
initSyncListeners();

// Prevent unhandled chunk errors from showing as console noise
// ErrorBoundary handles these gracefully — just suppress the duplicate
window.addEventListener('unhandledrejection', (event) => {
  const msg = (event.reason?.message || '').toLowerCase();
  if (
    msg.includes('dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('failed to fetch')
  ) {
    event.preventDefault(); // Suppress console error — ErrorBoundary handles this
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
