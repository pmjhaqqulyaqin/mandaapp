/**
 * API Response Cache — IndexedDB-backed cache for offline data access
 * 
 * Strategy: Cache-then-network for critical GET endpoints.
 * - On fetch success: cache response, return fresh data
 * - On fetch failure (offline): return cached data with staleness info
 * 
 * Performance: Uses singleton DB connection + batched writes via requestIdleCallback
 */

const DB_NAME = 'simanda-offline';
const DB_VERSION = 3; // Must match offlineAuth.ts — bumped to create missing stores
const STORE_NAME = 'apiCache';

interface CachedResponse {
  url: string;
  data: any;
  cachedAt: number;
  ttl: number; // ms
}

// TTL config per endpoint pattern (in ms)
const TTL_CONFIG: { pattern: RegExp; ttl: number }[] = [
  // User/Profile
  { pattern: /\/employees\/me/, ttl: 7 * 24 * 60 * 60 * 1000 },            // 7 days
  { pattern: /\/users\/role-permissions/, ttl: 7 * 24 * 60 * 60 * 1000 },   // 7 days
  // Jurnal
  { pattern: /\/jurnal\/schedule-today/, ttl: 12 * 60 * 60 * 1000 },        // 12 hours
  { pattern: /\/jurnal\/entries/, ttl: 24 * 60 * 60 * 1000 },               // 1 day
  { pattern: /\/jurnal\/methods/, ttl: 7 * 24 * 60 * 60 * 1000 },           // 7 days
  { pattern: /\/jurnal\/class-students/, ttl: 7 * 24 * 60 * 60 * 1000 },    // 7 days
  { pattern: /\/jurnal\/recap/, ttl: 24 * 60 * 60 * 1000 },                 // 1 day
  { pattern: /\/jurnal\/time-slots/, ttl: 7 * 24 * 60 * 60 * 1000 },        // 7 days
  // Attendance/Presensi
  { pattern: /\/attendance\/settings/, ttl: 7 * 24 * 60 * 60 * 1000 },      // 7 days
  { pattern: /\/attendance\/history/, ttl: 12 * 60 * 60 * 1000 },           // 12 hours
  { pattern: /\/attendance\/summary/, ttl: 12 * 60 * 60 * 1000 },           // 12 hours
  // Calendar/Events
  { pattern: /\/events/, ttl: 24 * 60 * 60 * 1000 },                        // 1 day
  // Site
  { pattern: /\/site-settings/, ttl: 24 * 60 * 60 * 1000 },                 // 1 day
  // Dashboard stats
  { pattern: /\/dashboard/, ttl: 12 * 60 * 60 * 1000 },                     // 12 hours
  { pattern: /\/statistics/, ttl: 12 * 60 * 60 * 1000 },                    // 12 hours
];

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour fallback

function getTTL(url: string): number {
  for (const { pattern, ttl } of TTL_CONFIG) {
    if (pattern.test(url)) return ttl;
  }
  return DEFAULT_TTL;
}

// ── Singleton DB Connection ──
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance && dbInstance.objectStoreNames.length > 0) {
    return Promise.resolve(dbInstance);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains('offlineAuth')) {
        db.createObjectStore('offlineAuth', { keyPath: 'email' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      // If connection is closed externally, reset singleton
      dbInstance.onclose = () => { dbInstance = null; dbPromise = null; };
      dbInstance.onerror = () => { dbInstance = null; dbPromise = null; };
      resolve(dbInstance);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ── Batched Write Queue ──
// Collect writes and flush them in a single transaction during idle time
let writeQueue: CachedResponse[] = [];
let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;

  const doFlush = () => {
    flushScheduled = false;
    const items = writeQueue.splice(0);
    if (items.length === 0) return;

    getDB().then(db => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const item of items) {
          store.put(item);
        }
        // No need to await — fire and forget
      } catch {
        // Transaction may fail if DB was closed, silently ignore
      }
    }).catch(() => {
      // DB open failed — silently ignore, caching is best-effort
    });
  };

  // Use requestIdleCallback if available (doesn't block main thread)
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(doFlush, { timeout: 2000 });
  } else {
    setTimeout(doFlush, 100);
  }
}

/**
 * Save API response to cache (non-blocking, batched)
 */
export async function cacheApiResponse(url: string, data: any): Promise<void> {
  const entry: CachedResponse = {
    url,
    data,
    cachedAt: Date.now(),
    ttl: getTTL(url),
  };
  writeQueue.push(entry);
  scheduleFlush();
}

/**
 * Get cached API response
 * Returns { data, isStale, cachedAt } or null if not cached
 */
export async function getCachedApiResponse(url: string): Promise<{ data: any; isStale: boolean; cachedAt: number } | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await new Promise<CachedResponse | undefined>((resolve, reject) => {
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    
    if (!result) return null;
    
    const age = Date.now() - result.cachedAt;
    const isStale = age > result.ttl;
    
    // Don't return very old data (> 30 days)
    if (age > 30 * 24 * 60 * 60 * 1000) return null;
    
    return { data: result.data, isStale, cachedAt: result.cachedAt };
  } catch {
    return null;
  }
}

/**
 * Clear all cached API responses
 */
export async function clearApiCache(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {}
}
