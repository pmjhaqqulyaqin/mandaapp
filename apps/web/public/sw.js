/**
 * Service Worker — MAN 2 Lombok Timur PWA
 * Provides offline caching, install capability, faster repeat loads,
 * and Background Sync for attendance & jurnal offline queue.
 */

const CACHE_NAME = 'man2lotim-pwa-v3';
const DB_NAME = 'simanda-offline';

// Core shell assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/pwa-icon-192x192.png',
  '/pwa-icon-512x512.png',
  '/pwa-icon-180x180.png',
  '/manifest.json',
];

// ─── Install ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Fetch — Network-first with cache fallback ──────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and API/auth requests
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;
  if (request.url.includes('/auth/')) return;

  // For navigation requests (HTML pages) — network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets — cache-first with network fallback
  if (
    request.url.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?|ttf|eot)$/) ||
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default — network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Background Sync — Process offline queue ────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'sync-attendance' || event.tag === 'sync-jurnal') {
    event.waitUntil(processOfflineQueue());
  }
});

// ─── Process Offline Queue from IndexedDB ───────────────
async function processOfflineQueue() {
  try {
    const db = await openIndexedDB();
    const pending = await getPendingItems(db);
    
    if (pending.length === 0) {
      console.log('[SW] No pending items in sync queue');
      db.close();
      return;
    }

    console.log(`[SW] Processing ${pending.length} queued items`);
    
    const ENDPOINT_MAP = {
      attendance_scan: { url: '/attendance/scan', method: 'POST' },
      jurnal_create: { url: '/jurnal/entries', method: 'POST' },
      jurnal_submit: { url: '/jurnal/entries/{id}/submit', method: 'PUT' },
      jurnal_attachment: { url: '/jurnal/attachments', method: 'POST' },
    };

    let synced = 0;
    for (const item of pending) {
      try {
        const endpoint = ENDPOINT_MAP[item.type];
        if (!endpoint) continue;

        let url = endpoint.url;
        if (item.type === 'jurnal_submit' && item.payload?.entryId) {
          url = url.replace('{id}', item.payload.entryId);
        }

        // Clean payload
        const payload = { ...item.payload };
        delete payload._offlineTimestamp;
        delete payload._formData;

        // Determine API base URL from current origin
        const apiBase = self.location.origin + '/api';

        const response = await fetch(`${apiBase}${url}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await markItemSynced(db, item.id);
          synced++;
        } else {
          await markItemFailed(db, item.id, `HTTP ${response.status}`);
        }
      } catch (err) {
        await markItemFailed(db, item.id, err.message || 'Network error');
      }
    }

    console.log(`[SW] Background sync complete: ${synced}/${pending.length} synced`);
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced,
        total: pending.length,
      });
    });

    db.close();
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

// ─── IndexedDB Helpers (for Service Worker context) ─────
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getPendingItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const index = store.index('status');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function markItemSynced(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.status = 'synced';
        item.syncedAt = Date.now();
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

function markItemFailed(db, id, errorMessage) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.retryCount = (item.retryCount || 0) + 1;
        item.status = item.retryCount >= 5 ? 'failed' : 'pending';
        item.errorMessage = errorMessage;
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
