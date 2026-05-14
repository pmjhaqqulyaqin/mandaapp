/**
 * offlineDb.ts — IndexedDB wrapper for offline-first data storage
 * 
 * Stores:
 * - syncQueue: pending API calls to sync when online
 * - cachedData: reference data (students, schedules) for offline lookup
 * - offlineLog: local activity log for UI display
 * 
 * Performance: Uses singleton DB connection to avoid repeated open/close overhead.
 */

const DB_NAME = 'simanda-offline';
const DB_VERSION = 3; // Must match apiCache.ts and offlineAuth.ts

export type SyncItemType = 'attendance_scan' | 'jurnal_create' | 'jurnal_submit' | 'jurnal_attachment';
export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id?: number;
  type: SyncItemType;
  payload: any;
  status: SyncItemStatus;
  retryCount: number;
  createdAt: number; // timestamp
  syncedAt: number | null;
  errorMessage?: string;
}

export interface CachedDataItem {
  key: string; // e.g. 'students', 'schedule_today', 'attendance_settings'
  data: any;
  updatedAt: number;
  expiresAt: number;
}

export interface OfflineLogItem {
  id?: number;
  type: string;
  summary: string;
  timestamp: number;
  synced: boolean;
}

// ── Singleton Database Connection ──
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbInstance) {
    // Verify the connection is still alive
    try {
      // A lightweight check: objectStoreNames access throws if connection is dead
      if (dbInstance.objectStoreNames.length >= 0) {
        return Promise.resolve(dbInstance);
      }
    } catch {
      dbInstance = null;
      dbPromise = null;
    }
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create ALL stores from ALL modules to prevent version conflicts
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('offlineLog')) {
        const logStore = db.createObjectStore('offlineLog', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      // Stores from apiCache.ts
      if (!db.objectStoreNames.contains('apiCache')) {
        db.createObjectStore('apiCache', { keyPath: 'url' });
      }
      // Stores from offlineAuth.ts
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

// ── Generic transaction helper (NO db.close() — singleton) ──
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStoreAll<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T[]>
): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ── Sync Queue Operations ──
export const syncQueue = {
  async add(type: SyncItemType, payload: any): Promise<number> {
    const item: Omit<SyncQueueItem, 'id'> = {
      type,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
      syncedAt: null,
    };
    return withStore<number>('syncQueue', 'readwrite', (store) => store.add(item) as IDBRequest<number>);
  },

  async getPending(): Promise<SyncQueueItem[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async getFailed(): Promise<SyncQueueItem[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.getAll('failed');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async markSyncing(id: number): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.status = 'syncing';
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async markSynced(id: number): Promise<void> {
    const db = await openDb();
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
  },

  async markFailed(id: number, errorMessage: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.status = item.retryCount >= 5 ? 'failed' : 'pending';
          item.retryCount += 1;
          item.errorMessage = errorMessage;
          store.put(item);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async getPendingCount(): Promise<number> {
    const items = await this.getPending();
    const failed = await this.getFailed();
    return items.length + failed.length;
  },

  async clearSynced(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.openCursor('synced');
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => { resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Remove items older than 3 days */
  async purgeExpired(): Promise<number> {
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THREE_DAYS;
    let purged = 0;
    
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          if (cursor.value.createdAt < cutoff && cursor.value.status !== 'syncing') {
            cursor.delete();
            purged++;
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => { resolve(purged); };
      tx.onerror = () => reject(tx.error);
    });
  },
};

// ── Cached Data Operations ──
export const cachedData = {
  async set(key: string, data: any, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const item: CachedDataItem = {
      key,
      data,
      updatedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    await withStore('cachedData', 'readwrite', (store) => store.put(item));
  },

  async get<T = any>(key: string): Promise<T | null> {
    const item = await withStore<CachedDataItem | undefined>('cachedData', 'readonly', (store) => store.get(key));
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      // Expired — delete and return null
      await withStore('cachedData', 'readwrite', (store) => store.delete(key));
      return null;
    }
    return item.data as T;
  },

  async delete(key: string): Promise<void> {
    await withStore('cachedData', 'readwrite', (store) => store.delete(key));
  },
};

// ── Offline Log Operations ──
export const offlineLog = {
  async add(type: string, summary: string): Promise<void> {
    const item: Omit<OfflineLogItem, 'id'> = {
      type,
      summary,
      timestamp: Date.now(),
      synced: false,
    };
    await withStore('offlineLog', 'readwrite', (store) => store.add(item));
  },

  async getRecent(limit: number = 20): Promise<OfflineLogItem[]> {
    const all = await withStoreAll<OfflineLogItem>('offlineLog', 'readonly', (store) => store.getAll());
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  async markAllSynced(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineLog', 'readwrite');
      const store = tx.objectStore('offlineLog');
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          if (!cursor.value.synced) {
            cursor.value.synced = true;
            cursor.update(cursor.value);
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => { resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Clear logs older than 7 days */
  async purge(): Promise<void> {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - SEVEN_DAYS;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineLog', 'readwrite');
      const store = tx.objectStore('offlineLog');
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => { resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  },
};
