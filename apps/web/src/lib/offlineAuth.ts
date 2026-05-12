/**
 * Offline Auth — Credential caching for offline login capability
 * 
 * Flow:
 * 1. On successful online login → cache { email, passwordHash, userData } in IndexedDB
 * 2. On offline login attempt → verify password against cached hash
 * 3. Load cached userData to restore session UI
 * 
 * Security: Uses SHA-256 hashing (SubtleCrypto). Expires after 30 days.
 * 
 * DB Strategy: Shares the same DB name/version as apiCache.ts to avoid
 * upgrade conflicts. Uses a shared openDB that creates all stores.
 */

const DB_NAME = 'simanda-offline';
const DB_VERSION = 2;
const AUTH_STORE = 'offlineAuth';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedCredential {
  email: string;
  passwordHash: string;
  userData: any;
  cachedAt: number;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'simanda-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Shared DB opener — creates ALL stores needed by the app
// This prevents version conflicts between apiCache and offlineAuth
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  // Reuse existing connection if available
  if (dbInstance && dbInstance.objectStoreNames.contains(AUTH_STORE)) {
    return Promise.resolve(dbInstance);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('apiCache')) {
        db.createObjectStore('apiCache', { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE, { keyPath: 'email' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; dbPromise = null; };
      resolve(dbInstance);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Cache credentials after a successful online login
 */
export async function cacheCredentials(email: string, password: string, userData: any): Promise<void> {
  try {
    const db = await openDB();
    const passwordHash = await hashPassword(password);
    const tx = db.transaction(AUTH_STORE, 'readwrite');
    const store = tx.objectStore(AUTH_STORE);
    
    const credential: CachedCredential = {
      email: email.toLowerCase().trim(),
      passwordHash,
      userData,
      cachedAt: Date.now(),
    };
    
    store.put(credential);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log('[OfflineAuth] Credentials cached successfully for:', email);
  } catch (err) {
    console.warn('[OfflineAuth] Failed to cache credentials:', err);
  }
}

/**
 * Attempt offline login using cached credentials
 * Returns: { success: true, user } or { success: false, reason: 'no_cache'|'expired'|'wrong_password' }
 */
export type OfflineLoginResult = 
  | { success: true; user: any }
  | { success: false; reason: 'no_cache' | 'expired' | 'wrong_password' };

export async function offlineLogin(email: string, password: string): Promise<OfflineLoginResult> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUTH_STORE, 'readonly');
    const store = tx.objectStore(AUTH_STORE);
    
    const result = await new Promise<CachedCredential | undefined>((resolve, reject) => {
      const req = store.get(email.toLowerCase().trim());
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    
    if (!result) {
      console.log('[OfflineAuth] No cached credentials found for:', email);
      return { success: false, reason: 'no_cache' };
    }
    
    // Check expiry
    if (Date.now() - result.cachedAt > MAX_AGE_MS) {
      console.warn('[OfflineAuth] Cached credentials expired');
      return { success: false, reason: 'expired' };
    }
    
    // Verify password
    const inputHash = await hashPassword(password);
    if (inputHash !== result.passwordHash) {
      console.log('[OfflineAuth] Password mismatch');
      return { success: false, reason: 'wrong_password' };
    }
    
    console.log('[OfflineAuth] Offline login successful for:', email);
    return { success: true, user: result.userData };
  } catch (err) {
    console.warn('[OfflineAuth] Offline login failed:', err);
    return { success: false, reason: 'no_cache' };
  }
}

/**
 * Clear cached credentials (on logout)
 */
export async function clearCachedCredentials(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUTH_STORE, 'readwrite');
    tx.objectStore(AUTH_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineAuth] Failed to clear credentials:', err);
  }
}

/**
 * Check if we have cached credentials for any user
 */
export async function hasCachedCredentials(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUTH_STORE, 'readonly');
    const store = tx.objectStore(AUTH_STORE);
    const count = await new Promise<number>((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return count > 0;
  } catch {
    return false;
  }
}
