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
  'wali_kelas', 'pembina_ekstra', 'guru'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          setUser(parseUser(data.user));
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
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
        setUser(parseUser(data.user));
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
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        setUser(parseUser(data.user));
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
