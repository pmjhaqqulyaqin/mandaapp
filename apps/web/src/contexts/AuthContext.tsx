import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authClient } from '../lib/auth-client';

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
  | 'student';

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
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || 'Login gagal');
      }

      if (data?.user) {
        const parsedUser = parseUser(data.user);
        setUser(parsedUser);
        localStorage.setItem('mandualotim_user', JSON.stringify(parsedUser));
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
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        const parsedUser = parseUser(data.user);
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
