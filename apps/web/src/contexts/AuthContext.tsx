import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authClient } from '../lib/auth-client';
import { cacheCredentials, offlineLogin, clearCachedCredentials } from '../lib/offlineAuth';

export type UserRole = 
  | 'admin' 
  | 'kepala_madrasah' 
  | 'wakil_kepala' 
  | 'kepala_unit' 
  | 'wali_kelas' 
  | 'pembina_ekstra' 
  | 'guru' 
  | 'kepala_tu' 
  | 'pegawai_tu' 
  | 'student'
  | 'orang_tua';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string | null;
  banned?: boolean;
  banReason?: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
  isStaffRole: boolean;
  isAdmin: boolean;
  needsRoleSelection: boolean;
}

function parseUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role || 'student',
    image: raw.image,
    banned: raw.banned || false,
    banReason: raw.banReason || null,
    emailVerified: raw.emailVerified,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Staff roles that have access to galeri & berita
const STAFF_ROLES: UserRole[] = [
  'admin', 'kepala_madrasah', 'wakil_kepala', 'kepala_unit',
  'wali_kelas', 'pembina_ekstra', 'guru', 'kepala_tu', 'pegawai_tu'
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSISTENT USER STORAGE
// Triple-backup strategy: localStorage + IndexedDB + persist request
// Mobile browsers (especially iOS Safari ITP) can silently delete
// localStorage after 7 days without visits. IndexedDB is more durable.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const IDB_NAME = 'simanda-auth';
const IDB_STORE = 'session';
const IDB_KEY = 'current_user';
const LS_KEY = 'mandualotim_user';

/** Write user to both localStorage AND IndexedDB */
async function persistUser(user: User): Promise<void> {
  // 1. localStorage (synchronous, fast)
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(user));
  } catch {}
  
  // 2. IndexedDB (async, more durable on mobile)
  try {
    const db = await openAuthDb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ key: IDB_KEY, user, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Auth] IndexedDB write failed:', e);
  }
}

/** Clear user from both localStorage AND IndexedDB */
async function clearPersistedUser(): Promise<void> {
  try { localStorage.removeItem(LS_KEY); } catch {}
  try {
    const db = await openAuthDb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

/** Read user from localStorage first (fast), then IndexedDB as fallback */
function readUserSync(): User | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

async function readUserFromIdb(): Promise<User | null> {
  try {
    const db = await openAuthDb();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    const result = await new Promise<any>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (result?.user) return result.user as User;
  } catch (e) {
    console.warn('[Auth] IndexedDB read failed:', e);
  }
  return null;
}

/** Open auth-specific IndexedDB (separate from main app DB to avoid version conflicts) */
let authDbInstance: IDBDatabase | null = null;
function openAuthDb(): Promise<IDBDatabase> {
  if (authDbInstance) {
    try {
      // Quick health check
      authDbInstance.objectStoreNames;
      return Promise.resolve(authDbInstance);
    } catch {
      authDbInstance = null;
    }
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      authDbInstance = req.result;
      authDbInstance.onclose = () => { authDbInstance = null; };
      resolve(authDbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Request persistent storage so browser doesn't evict our data */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist) {
      const granted = await navigator.storage.persist();
      console.log('[Auth] Persistent storage:', granted ? 'granted ✓' : 'denied');
    }
  } catch {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Optimistically load from localStorage (synchronous, fast)
    return readUserSync();
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If localStorage has user, show UI immediately. But also need to check IDB.
    return !readUserSync();
  });
  const idbChecked = useRef(false);

  // On mount: check IndexedDB as fallback if localStorage was empty
  // Also request persistent storage to prevent data eviction
  useEffect(() => {
    const init = async () => {
      // Request persistent storage
      requestPersistentStorage();

      // If localStorage had no user, check IndexedDB
      if (!user && !idbChecked.current) {
        idbChecked.current = true;
        const idbUser = await readUserFromIdb();
        if (idbUser) {
          console.log('[Auth] Restored user from IndexedDB (localStorage was empty!)');
          setUser(idbUser);
          // Re-populate localStorage from IDB
          try { localStorage.setItem(LS_KEY, JSON.stringify(idbUser)); } catch {}
          setIsLoading(false);
          return; // Skip server session check — we already recovered the user
        }
      }

      // Background session check (non-blocking, never causes logout)
      if (navigator.onLine) {
        try {
          const { data, error } = await authClient.getSession();
          if (error) {
            console.log('[Auth] Session fetch error (non-fatal):', error);
          } else if (data?.user) {
            const parsedUser = parseUser(data.user);
            setUser(parsedUser);
            persistUser(parsedUser); // Dual-write
          } else {
            // Server says no session — DON'T clear anything!
            // On mobile PWA, cookies get purged but our local storage persists.
            console.log('[Auth] Server returned no session — keeping local user state');
          }
        } catch (e) {
          console.log('[Auth] Session fetch exception (non-fatal):', e);
        }
      } else {
        console.log('[Auth] Offline — skipping session fetch, using cached user');
      }

      setIsLoading(false);
    };

    init();
  }, []);

  // Silent session refresh every 14 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          const parsedUser = parseUser(data.user);
          setUser(parsedUser);
          persistUser(parsedUser);
        }
        // If no session, DON'T clear — same as mount logic
      } catch {}
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    console.log('[Auth] Login attempt for:', email, 'online:', navigator.onLine);

    // ━━ FAST PATH: If clearly offline, skip network ━━
    if (!navigator.onLine) {
      try {
        const result = await offlineLogin(email, password);
        console.log('[Auth] Offline login result:', result);
        if (result.success) {
          setUser(result.user);
          persistUser(result.user);
          return;
        }
        throw new Error(`OFFLINE_${result.reason.toUpperCase()}`);
      } finally {
        setIsLoading(false);
      }
    }

    // ━━ ONLINE PATH: Try server, fall back to offline ━━
    try {
      // Race login against 8-second timeout
      const loginPromise = authClient.signIn.email({ email, password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 8000)
      );

      let data: any, error: any;
      try {
        const result = await Promise.race([loginPromise, timeoutPromise]);
        data = result?.data;
        error = result?.error;
      } catch (raceError: any) {
        // Timeout or network error → try offline
        console.log('[Auth] Online login failed:', raceError.message);
        const offResult = await offlineLogin(email, password);
        if (offResult.success) {
          setUser(offResult.user);
          persistUser(offResult.user);
          return;
        }
        throw new Error(`OFFLINE_${offResult.reason.toUpperCase()}`);
      }

      if (error) {
        const errMsg = (error.message || error.statusText || '').toLowerCase();
        const isNetErr = errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('abort');
        if (isNetErr) {
          const offResult = await offlineLogin(email, password);
          if (offResult.success) {
            setUser(offResult.user);
            persistUser(offResult.user);
            return;
          }
          throw new Error(`OFFLINE_${offResult.reason.toUpperCase()}`);
        }
        throw new Error(error.message || 'Login gagal');
      }

      if (data?.user) {
        const parsedUser = parseUser(data.user);
        setUser(parsedUser);
        persistUser(parsedUser); // Dual-write to localStorage + IndexedDB
        
        // Cache credentials for offline login — with verification
        try {
          await cacheCredentials(email, password, parsedUser);
          // Verify it was actually stored
          const verifyKey = 'simanda_offline_cred_' + email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '');
          const stored = localStorage.getItem(verifyKey);
          console.log('[Auth] Credential cache verified:', !!stored, 'key:', verifyKey);
        } catch (cacheErr) {
          console.error('[Auth] FAILED to cache credentials:', cacheErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearPersistedUser(); // Clear both localStorage + IndexedDB
      // NOTE: Do NOT clear offline credentials here!
      // They must persist across logouts so the user can log back in offline.
      // clearCachedCredentials() is only for "forget this device" scenarios.
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        const parsedUser = parseUser(data.user);
        // If the server still returns a stale role (e.g. 'student' due to cookie cache),
        // but localStorage has an optimistically-updated role, prefer localStorage
        const savedUserRaw = localStorage.getItem(LS_KEY);
        if (savedUserRaw) {
          try {
            const savedUser = JSON.parse(savedUserRaw);
            if (savedUser.role && savedUser.role !== 'student' && parsedUser.role === 'student') {
              parsedUser.role = savedUser.role;
            }
          } catch {}
        }
        setUser(parsedUser);
        persistUser(parsedUser);
      } else {
        // Server returned no session — DON'T clear user (mobile PWA cookie loss)
        console.log('[Auth] refreshSession: server returned no session, keeping cached user');
      }
    } catch (error) {
      console.error('[Auth] refreshSession error (non-fatal):', error);
    }
  }, []);

  const isAdmin = user?.role === 'admin';
  const isStaffRole = user ? STAFF_ROLES.includes(user.role) : false;
  // New OAuth users get default role 'student' but haven't explicitly chosen it
  // We detect this by checking if they have no account password (OAuth only)
  const needsRoleSelection = !!user && !user.role;

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      logout, 
      refreshSession,
      isLoading,
      isStaffRole,
      isAdmin,
      needsRoleSelection,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
