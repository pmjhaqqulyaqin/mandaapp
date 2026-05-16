import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Optimistically load user from localStorage to prevent logout on refresh
    const savedUser = localStorage.getItem('mandualotim_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If we have a saved user, we can show the UI immediately while verifying in background
    return !localStorage.getItem('mandualotim_user');
  });

  // Fetch current session on mount
  // STRATEGY (inspired by lapkin): Trust localStorage as the source of truth for "am I logged in?".
  // The server session check is a BONUS — if it succeeds, we refresh user data.
  // If it fails (cookie lost on mobile PWA, network error, etc.), we keep the cached user.
  // The user is ONLY cleared on explicit logout (never on passive session check).
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // If offline, skip session fetch entirely — trust localStorage
        if (!navigator.onLine) {
          console.log('[Auth] Offline — skipping session fetch, using cached user');
          return;
        }

        const { data, error } = await authClient.getSession();
        
        if (error) {
          console.error('[Auth] Session fetch error (non-fatal, keeping cached user):', error);
          // Don't log out on error - could be temporary network issue on mobile
          // Keep the saved user from localStorage
          return;
        }

        if (data?.user) {
          const parsedUser = parseUser(data.user);
          setUser(parsedUser);
          localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
        } else {
          // Server says no session — but DON'T clear localStorage!
          // On mobile PWA, cookies (SameSite=None; Secure) are frequently purged
          // by the OS while localStorage persists. Clearing here would force
          // re-login every time the app is opened.
          // Only clear if there was never a saved user (fresh visitor).
          if (!localStorage.getItem('mandualotim_user')) {
            setUser(null);
          } else {
            console.log('[Auth] Server returned no session, but localStorage has user — keeping login state (mobile PWA cookie loss is expected)');
            // Keep existing user state — don't logout
          }
        }
      } catch (error) {
        console.error('[Auth] Session fetch exception (non-fatal, keeping cached user):', error);
        // Network error - keep existing user state (don't logout on mobile)
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    // Silently refresh session every 14 minutes to keep it alive on mobile
    // (more frequent than before to prevent cookie expiry)
    const refreshInterval = setInterval(async () => {
      if (!navigator.onLine) return; // Don't attempt when offline
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          const parsedUser = parseUser(data.user);
          setUser(parsedUser);
          localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
        }
        // If no session returned, DON'T clear — same logic as mount
      } catch (e) {
        // Ignore - don't disrupt user on network issues
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
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
          localStorage.setItem('mandualotim_user', JSON.stringify(result.user));
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
          localStorage.setItem('mandualotim_user', JSON.stringify(offResult.user));
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
            localStorage.setItem('mandualotim_user', JSON.stringify(offResult.user));
            return;
          }
          throw new Error(`OFFLINE_${offResult.reason.toUpperCase()}`);
        }
        throw new Error(error.message || 'Login gagal');
      }

      if (data?.user) {
        const parsedUser = parseUser(data.user);
        setUser(parsedUser);
        localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
        
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
      localStorage.removeItem('mandualotim_user');
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
        const savedUserRaw = localStorage.getItem('mandualotim_user');
        if (savedUserRaw) {
          try {
            const savedUser = JSON.parse(savedUserRaw);
            if (savedUser.role && savedUser.role !== 'student' && parsedUser.role === 'student') {
              parsedUser.role = savedUser.role;
            }
          } catch {}
        }
        setUser(parsedUser);
        localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
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
