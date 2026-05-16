import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isAutoReloading: boolean;
}

/**
 * Detect if an error is a chunk/module loading failure
 * (happens after new deployment when old chunks are gone, OR when offline)
 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  return (
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('dynamically imported module') ||
    msg.includes('loading module') ||
    msg.includes('importing a module') ||
    msg.includes('failed to fetch') ||
    name === 'chunkerror' ||
    name === 'chunkloaderror'
  );
}

/**
 * Silently clear all SW caches and unregister workers, then hard reload.
 * Returns true if reload was triggered.
 */
async function silentClearAndReload(): Promise<boolean> {
  const RELOAD_KEY = 'simanda_eb_reload';
  const RELOAD_COUNT_KEY = 'simanda_eb_reload_count';
  const MAX_RELOADS = 2; // Max auto-reloads within the time window
  const WINDOW_MS = 120_000; // 2-minute window

  const now = Date.now();
  const lastReload = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
  const reloadCount = parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);

  // Reset count if outside the window
  if (now - lastReload > WINDOW_MS) {
    sessionStorage.setItem(RELOAD_COUNT_KEY, '1');
    sessionStorage.setItem(RELOAD_KEY, now.toString());
  } else if (reloadCount >= MAX_RELOADS) {
    // Too many reloads — give up auto-reloading
    return false;
  } else {
    sessionStorage.setItem(RELOAD_COUNT_KEY, (reloadCount + 1).toString());
    sessionStorage.setItem(RELOAD_KEY, now.toString());
  }

  try {
    // 1. Delete all SW caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // 2. Unregister all service workers
    const registrations = await navigator.serviceWorker?.getRegistrations();
    if (registrations) {
      await Promise.all(registrations.map(r => r.unregister()));
    }
  } catch (e) {
    console.warn('[ErrorBoundary] Failed to clear SW caches:', e);
  }

  // 3. Hard reload (bypass cache)
  window.location.reload();
  return true;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isAutoReloading: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // ━━ CHUNK LOAD ERROR + ONLINE ━━
    // This is the "Pembaruan Tersedia" scenario.
    // Strategy: auto-reload SILENTLY — no white screen, no scary UI.
    // Show a branded loading spinner during the process.
    if (isChunkLoadError(error) && navigator.onLine) {
      this.setState({ isAutoReloading: true });
      silentClearAndReload().then((reloaded) => {
        if (!reloaded) {
          // Exhausted auto-reload attempts — show manual UI
          this.setState({ isAutoReloading: false });
        }
        // If reloaded === true, page will reload, state doesn't matter
      });
      return;
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isAutoReloading: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isAutoReloading: false });
    window.location.href = '/dashboard';
  };

  handleForceReload = () => {
    // User explicitly clicked reload — reset counters and force
    sessionStorage.removeItem('simanda_eb_reload');
    sessionStorage.removeItem('simanda_eb_reload_count');
    this.setState({ isAutoReloading: true });
    silentClearAndReload();
  };

  render() {
    if (this.state.hasError) {
      // ━━ AUTO-RELOADING: show subtle branded spinner instead of blank white ━━
      if (this.state.isAutoReloading) {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#f9fafb',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}>
            <style>{`
              @keyframes eb-spin { to { transform: rotate(360deg); } }
              @keyframes eb-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
            `}</style>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #e5e7eb', borderTopColor: '#16a34a',
              animation: 'eb-spin 0.8s linear infinite',
              marginBottom: 16,
            }} />
            <p style={{
              color: '#6b7280', fontSize: 14, fontWeight: 500,
              animation: 'eb-pulse 1.5s ease-in-out infinite',
            }}>Memperbarui aplikasi…</p>
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkErr = this.state.error ? isChunkLoadError(this.state.error) : false;
      const isOffline = !navigator.onLine;

      // Determine the right message based on context
      const title = isChunkErr && isOffline 
        ? 'Halaman Tidak Tersedia Offline'
        : isChunkErr 
          ? 'Perlu Muat Ulang' 
          : 'Terjadi Kesalahan';

      const description = isChunkErr && isOffline
        ? 'Halaman ini belum di-cache untuk mode offline. Kembali ke Dashboard atau hubungkan internet untuk memuat halaman ini.'
        : isChunkErr
          ? 'Versi terbaru tersedia namun gagal dimuat otomatis. Ketuk tombol di bawah untuk memuat ulang.'
          : 'Aplikasi mengalami masalah yang tidak terduga. Silakan coba muat ulang halaman.';

      const iconColor = isChunkErr && isOffline 
        ? 'bg-amber-50 dark:bg-amber-900/20' 
        : isChunkErr 
          ? 'bg-blue-50 dark:bg-blue-900/20' 
          : 'bg-red-50 dark:bg-red-900/20';

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#121212] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            {/* Icon */}
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${iconColor}`}>
              {isChunkErr && isOffline ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                  <line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
              ) : isChunkErr ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {description}
            </p>

            {/* Error details (collapsible) — only for non-chunk errors */}
            {!isChunkErr && this.state.error && (
              <details className="text-left mb-6 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <summary className="text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  Detail Teknis
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>{'\n\n'}Component Stack:{this.state.errorInfo.componentStack}</>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              {isChunkErr && isOffline ? (
                <button
                  onClick={this.handleGoHome}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                >
                  ← Kembali ke Dashboard
                </button>
              ) : (
                <>
                  {!isChunkErr && (
                    <button
                      onClick={this.handleReset}
                      className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Coba Lagi
                    </button>
                  )}
                  <button
                    onClick={this.handleForceReload}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                  >
                    {isChunkErr ? '🔄 Muat Ulang Sekarang' : 'Muat Ulang Halaman'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
