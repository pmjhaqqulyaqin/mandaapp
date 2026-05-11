/**
 * API Response Cache — IndexedDB-backed cache for offline data access
 * 
 * Strategy: Cache-then-network for critical GET endpoints.
 * - On fetch success: cache response, return fresh data
 * - On fetch failure (offline): return cached data with staleness info
 */

const DB_NAME = 'simanda-offline';
const DB_VERSION = 2;
const STORE_NAME = 'apiCache';

interface CachedResponse {
  url: string;
  data: any;
  cachedAt: number;
  ttl: number; // ms
}

// TTL config per endpoint pattern (in ms)
const TTL_CONFIG: { pattern: RegExp; ttl: number }[] = [
  { pattern: /\/employees\/me/, ttl: 7 * 24 * 60 * 60 * 1000 },           // 7 days
  { pattern: /\/jurnal\/schedule-today/, ttl: 12 * 60 * 60 * 1000 },       // 12 hours
  { pattern: /\/jurnal\/entries/, ttl: 24 * 60 * 60 * 1000 },              // 1 day
  { pattern: /\/jurnal\/methods/, ttl: 7 * 24 * 60 * 60 * 1000 },          // 7 days
  { pattern: /\/jurnal\/class-students/, ttl: 7 * 24 * 60 * 60 * 1000 },   // 7 days
  { pattern: /\/jurnal\/recap/, ttl: 24 * 60 * 60 * 1000 },                // 1 day
  { pattern: /\/jurnal\/time-slots/, ttl: 7 * 24 * 60 * 60 * 1000 },       // 7 days
  { pattern: /\/users\/role-permissions/, ttl: 7 * 24 * 60 * 60 * 1000 },  // 7 days
  { pattern: /\/attendance\/settings/, ttl: 7 * 24 * 60 * 60 * 1000 },     // 7 days
  { pattern: /\/site-settings/, ttl: 24 * 60 * 60 * 1000 },                // 1 day
];

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour fallback

function getTTL(url: string): number {
  for (const { pattern, ttl } of TTL_CONFIG) {
    if (pattern.test(url)) return ttl;
  }
  return DEFAULT_TTL;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save API response to cache
 */
export async function cacheApiResponse(url: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: CachedResponse = {
      url,
      data,
      cachedAt: Date.now(),
      ttl: getTTL(url),
    };
    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    // Silently fail — caching is best-effort
  }
}

/**
 * Get cached API response
 * Returns { data, isStale, cachedAt } or null if not cached
 */
export async function getCachedApiResponse(url: string): Promise<{ data: any; isStale: boolean; cachedAt: number } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await new Promise<CachedResponse | undefined>((resolve, reject) => {
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    
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
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}
