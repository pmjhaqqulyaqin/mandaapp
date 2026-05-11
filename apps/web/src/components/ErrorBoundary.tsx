import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Detect if an error is a chunk/module loading failure
 * (happens after new deployment when old chunks are gone)
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
    name === 'chunkerror' ||
    name === 'chunkloaderror'
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // Auto-reload on chunk load errors (new deployment invalidated old chunks)
    if (isChunkLoadError(error)) {
      const reloadKey = 'simanda_chunk_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      // Prevent infinite reload loop — only auto-reload once per 30 seconds
      if (!lastReload || now - parseInt(lastReload) > 30000) {
        sessionStorage.setItem(reloadKey, now.toString());
        console.log('[ErrorBoundary] Chunk load error detected — auto-reloading...');
        window.location.reload();
        return;
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkErr = this.state.error ? isChunkLoadError(this.state.error) : false;

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#121212] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            {/* Icon */}
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
              isChunkErr ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              {isChunkErr ? (
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
              {isChunkErr ? 'Pembaruan Tersedia' : 'Terjadi Kesalahan'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {isChunkErr 
                ? 'Aplikasi telah diperbarui. Muat ulang halaman untuk menggunakan versi terbaru.'
                : 'Aplikasi mengalami masalah yang tidak terduga. Silakan coba muat ulang halaman.'
              }
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
              {!isChunkErr && (
                <button
                  onClick={this.handleReset}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Coba Lagi
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                {isChunkErr ? '🔄 Muat Ulang Sekarang' : 'Muat Ulang Halaman'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
