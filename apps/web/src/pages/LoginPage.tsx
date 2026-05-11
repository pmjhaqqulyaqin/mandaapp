import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSiteSettings } from '../hooks/api/useSettings';
import { API_BASE_URL } from '../lib/api';
import { hasCachedCredentials } from '../lib/offlineAuth';

const SERVER_BASE = API_BASE_URL.replace(/\/api$/, '');

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasOfflineLogin, setHasOfflineLogin] = useState(false);
  
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { get } = useSiteSettings();

  // Get dynamic hero background from settings, same as landing page
  const heroImageRaw = get('hero_background_url');
  const heroImage = heroImageRaw ? (heroImageRaw.startsWith('/') ? `${SERVER_BASE}${heroImageRaw}` : heroImageRaw) : '/hero-building.png';

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

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    hasCachedCredentials().then(setHasOfflineLogin);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoadingState(true);
    setError('');
    
    try {
      await login(email, password);
      // Role-based redirect
      const savedUser = localStorage.getItem('mandualotim_user');
      const parsedRole = savedUser ? JSON.parse(savedUser)?.role : null;
      const defaultDest = parsedRole === 'orang_tua' ? '/portal-ortu' : '/dashboard';
      const from = location.state?.from?.pathname || defaultDest;
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setIsLoadingState(false);
    }
  };

  const isLoading = isLoadingState || authLoading;

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-black">
      {/* Background Layer 1: Sky (fallback for transparent hero images like hero-building.png) */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-60 mix-blend-overlay gradient-to-b from-sky-400 via-sky-300 to-orange-200"
        style={{ backgroundImage: `url('/Gambar Langit manda.png')` }}
      />
      {/* Sky Base Color */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-400 to-blue-400 z-[-1]"></div>

      {/* Background Layer 2: Dynamic Hero Image from Settings */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-[2]"
        style={{ backgroundImage: `url('${heroImage}')` }}
      />
      
      {/* Dim Layer to make the login box stand out */}
      <div className="absolute inset-0 bg-black/50 z-[5]"></div>

      <div className="w-full max-w-md p-6 sm:p-10 bg-[#188e63] rounded-xl shadow-2xl relative z-10 mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Login</h1>
          {isOffline && (
            <div className="mt-2 px-3 py-1.5 bg-amber-500/20 border border-amber-400/30 rounded-lg inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs text-amber-200 font-medium">
                {hasOfflineLogin ? 'Mode Offline — gunakan password untuk login' : 'Anda sedang offline'}
              </span>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50/90 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        
        <form className="flex flex-col gap-6" onSubmit={handleLogin}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#188e63]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 border-b border-white border-opacity-50">
              <input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-none text-white placeholder-white placeholder-opacity-90 focus:ring-0 px-0 py-2 text-lg font-medium outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#188e63]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 border-b border-white border-opacity-50">
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-none text-white placeholder-white placeholder-opacity-90 focus:ring-0 px-0 py-2 text-lg font-medium outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input type="checkbox" className="rounded border-white bg-transparent text-[#188e63] focus:ring-white h-4 w-4" />
              <span className="text-sm font-medium">Remember Me</span>
            </label>
            <a href="#" className="text-sm font-medium text-white underline hover:text-gray-200 transition-colors">Forgot Password</a>
          </div>
          
          <button
            type="button"
            onClick={async () => {
              try {
                const { signIn } = await import('../lib/auth-client');
                await signIn.social({
                  provider: "google",
                  callbackURL: window.location.origin + "/select-role",
                });
              } catch (err: any) {
                setError(err?.message || 'Gagal memulai login Google. Silakan coba lagi.');
              }
            }}
            className="w-full bg-white text-[#188e63] font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors mt-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#188e63"/>
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#188e63"/>
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#188e63"/>
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#188e63"/>
            </svg>
            Login with Google
          </button>

          <div className="flex justify-center mt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="px-10 py-3 bg-white text-[#188e63] font-bold text-lg rounded-full hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Kirim'}
            </button>
          </div>
        </form>

        <div className="absolute top-4 left-4">
           <Link to="/" className="text-white opacity-80 hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};
