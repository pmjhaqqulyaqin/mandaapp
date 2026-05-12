/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// ━━ Workbox Precaching ━━
// Automatically caches ALL build assets (JS, CSS, HTML, images)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ━━ SPA Navigation Fallback ━━
// For any navigation request (e.g. /dashboard, /jurnal, /attendance),
// serve the cached index.html — React Router handles the rest client-side
const navigationHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  // Don't intercept API calls or auth routes
  denylist: [/^\/api\//, /^\/auth\//],
});
registerRoute(navigationRoute);

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
