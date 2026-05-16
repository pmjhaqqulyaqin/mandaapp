/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// ━━ Workbox Precaching ━━
// Automatically caches ALL build assets (JS, CSS, HTML, images)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ━━ SPA Navigation Fallback ━━
// For any navigation request (e.g. /dashboard, /jurnal), serve index.html
// Uses NetworkFirst: try network, fallback to cached index.html
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    networkTimeoutSeconds: 3,
  }),
  {
    denylist: [/^\/api\//, /^\/auth\//],
  }
);
registerRoute(navigationRoute);

// ━━ Activation Strategy ━━
// skipWaiting() is called via message from the app (not automatically)
// This prevents chunk loading errors when a new SW activates while the old
// app is still running with old chunk references.
// clientsClaim() ensures the new SW takes over existing tabs after activation.
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
