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
          console.error('Failed to fetch session (error):', error);
          // Don't log out on error - could be temporary network issue on mobile
          // Keep the saved user from localStorage
          return;
        }

        if (data?.user) {
          const parsedUser = parseUser(data.user);
          setUser(parsedUser);
          localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
        } else {
          // Server explicitly says no session exists
          // Only clear if we don't have a saved user, or if the server clearly responded
          if (!localStorage.getItem('mandualotim_user')) {
            setUser(null);
          } else {
            // We have a saved user but server says no session
            // This means the session truly expired - clear it
            setUser(null);
            localStorage.removeItem('mandualotim_user');
          }
        }
      } catch (error) {
        console.error('Failed to fetch session (exception):', error);
        // Network error - keep existing user state (don't logout on mobile)
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    // Silently refresh session every 30 minutes to keep it alive on mobile
    const refreshInterval = setInterval(async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          const parsedUser = parseUser(data.user);
          setUser(parsedUser);
          localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
        }
      } catch (e) {
        // Ignore - don't disrupt user on network issues
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    // Helper: detect network-related errors
    const isNetworkError = (err?: any): boolean => {
      if (!navigator.onLine) return true;
      const msg = (err?.message || err?.statusText || '').toLowerCase();
      return msg.includes('failed to fetch') 
        || msg.includes('networkerror') 
        || msg.includes('network error')
        || msg.includes('load failed')
        || msg.includes('fetch')
        || msg === 'fetch error';
    };

    // Helper: attempt offline login fallback
    const tryOfflineLogin = async (): Promise<boolean> => {
      const cachedUser = await offlineLogin(email, password);
      if (cachedUser) {
        setUser(cachedUser);
        localStorage.setItem('mandualotim_user', JSON.stringify(cachedUser));
        return true;
      }
      return false;
    };

    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        // better-auth may catch fetch errors and return them as error objects
        // instead of throwing — check for network errors here too
        if (isNetworkError(error)) {
          if (await tryOfflineLogin()) return;
        }
        throw new Error(error.message || 'Login gagal');
      }

      if (data?.user) {
        const parsedUser = parseUser(data.user);
        setUser(parsedUser);
        localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
        // Cache credentials for offline login
        cacheCredentials(email, password, parsedUser).catch(() => {});
      }
    } catch (onlineError: any) {
      // If network error, try offline login
      if (isNetworkError(onlineError)) {
        if (await tryOfflineLogin()) return;
      }
      throw onlineError;
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
      clearCachedCredentials().catch(() => {});
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
        setUser(null);
        localStorage.removeItem('mandualotim_user');
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
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
