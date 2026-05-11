import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * NetworkStatusBanner — Shows a thin strip when offline + "Back online" toast
 * Renders at the top of DashboardLayout
 */
export const NetworkStatusBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowBackOnline(true);
        setTimeout(() => setShowBackOnline(false), 5000);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className={`sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium transition-all duration-300 ${
      isOffline
        ? 'bg-amber-500 text-white'
        : 'bg-emerald-500 text-white'
    }`}>
      {isOffline ? (
        <>
          <WifiOff size={14} />
          <span>Anda sedang offline — data terakhir ditampilkan</span>
        </>
      ) : (
        <>
          <Wifi size={14} />
          <span>Koneksi kembali!</span>
          <button
            onClick={() => { window.location.reload(); }}
            className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold flex items-center gap-1 hover:bg-white/30 active:scale-95"
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </>
      )}
    </div>
  );
};
