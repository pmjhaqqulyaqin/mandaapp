/**
 * Offline Auth — Credential caching for offline login capability
 * 
 * Flow:
 * 1. On successful online login → cache { email, passwordHash, userData } in IndexedDB
 * 2. On offline login attempt → verify password against cached hash
 * 3. Load cached userData to restore session UI
 * 
 * Security: Uses SHA-256 hashing (SubtleCrypto). Expires after 30 days.
 */

const DB_NAME = 'simanda-offline';
const DB_VERSION = 2; // Bump to add auth store
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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create auth store if not exists
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE, { keyPath: 'email' });
      }
      // Ensure syncQueue store exists (from v1)
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
    db.close();
  } catch (err) {
    console.warn('[OfflineAuth] Failed to cache credentials:', err);
  }
}

/**
 * Attempt offline login using cached credentials
 */
export async function offlineLogin(email: string, password: string): Promise<any | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(AUTH_STORE, 'readonly');
    const store = tx.objectStore(AUTH_STORE);
    
    const result = await new Promise<CachedCredential | undefined>((resolve, reject) => {
      const req = store.get(email.toLowerCase().trim());
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    
    if (!result) return null;
    
    // Check expiry
    if (Date.now() - result.cachedAt > MAX_AGE_MS) {
      console.warn('[OfflineAuth] Cached credentials expired');
      return null;
    }
    
    // Verify password
    const inputHash = await hashPassword(password);
    if (inputHash !== result.passwordHash) {
      return null;
    }
    
    return result.userData;
  } catch (err) {
    console.warn('[OfflineAuth] Offline login failed:', err);
    return null;
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
    db.close();
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
    db.close();
    return count > 0;
  } catch {
    return false;
  }
}
