import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '@mandaapp/ui';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoadingState, setIsLoadingState] = useState(false);
  
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Detect OAuth error from URL query params (set by Better Auth on failure)
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        'invalid_code': 'Kode autentikasi tidak valid. Silakan coba lagi.',
        'state_not_found': 'Sesi autentikasi expired. Silakan coba lagi.',
        'state_mismatch': 'Terjadi masalah sinkronisasi (state mismatch). Pastikan jam sistem Anda benar, atau coba gunakan Mode Incognito.',
        'oauth_provider_not_found': 'Provider OAuth tidak ditemukan.',
        'unable_to_get_user_info': 'Gagal mendapatkan informasi dari Google.',
        'email_not_found': 'Email tidak ditemukan dari akun Google Anda.',
        'no_code': 'Gagal mendapatkan kode dari Google.',
        'invalid_callback_request': 'Permintaan callback tidak valid.',
      };
      setError(errorMessages[oauthError] || `Login dengan Google gagal (${oauthError}). Silakan coba lagi.`);
      // Clean up URL
      searchParams.delete('error');
      searchParams.delete('error_description');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoadingState(true);
    setError('');
    
    try {
      await login(email, password);
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setIsLoadingState(false);
    }
  };

  const isLoading = isLoadingState || authLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4 transition-colors duration-300">
      <div className="w-full max-w-md p-8 bg-white dark:bg-[#0A0A0A] border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-primary mb-2">MANDALOTIM</h1>
          <p className="text-text-secondary">Masuk ke akun Anda</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        <form className="flex flex-col gap-5" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Email</label>
            <Input 
              type="email" 
              placeholder="Masukkan email Anda" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Password</label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-border-light text-primary focus:ring-primary" />
              <span className="text-text-secondary">Ingat saya</span>
            </label>
            <a href="#" className="font-medium text-primary hover:text-primary-hover transition-colors">Lupa password?</a>
          </div>
          
          <Button 
            type="submit"
            className="w-full mt-2"
            isLoading={isLoading}
            size="lg"
          >
            Masuk
          </Button>
        </form>

        {/* Separator */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border-light dark:bg-border-dark"></div>
          <span className="text-xs text-text-secondary font-medium">atau</span>
          <div className="flex-1 h-px bg-border-light dark:bg-border-dark"></div>
        </div>

        {/* Google Login */}
        <button
          type="button"
          onClick={() => {
            const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");
            const authBase = apiBase.endsWith("/api") ? apiBase + "/auth" : apiBase + "/api/auth";
            const callbackURL = window.location.origin + "/select-role";
            
            // Standard Better Auth initiation path (use lowercase /login)
            window.location.href = `${authBase}/login/social/google?callbackURL=${encodeURIComponent(callbackURL)}`;
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors text-sm font-medium text-text-primary dark:text-text-darkPrimary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Login dengan Google
        </button>
        
        <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
          <Link to="/" className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
};
