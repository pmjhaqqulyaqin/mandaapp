/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// ━━ Workbox Precaching ━━
// Automatically caches ALL build assets (JS, CSS, HTML, images)
// This is what makes the app work fully offline
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Take control immediately on install/activate
self.skipWaiting();
clientsClaim();

// ━━ Handle messages from the app ━━
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ━━ Background Sync: Process offline queue when back online ━━
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});
