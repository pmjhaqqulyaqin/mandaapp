import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, Loader2 } from 'lucide-react';
import { syncQueue } from '../lib/offlineDb';
import { processQueue, onSyncEvent } from '../lib/syncEngine';

/**
 * NetworkStatusBanner — Shows a thin strip when offline + pending sync count
 * Auto-syncs when back online and shows progress
 */
export const NetworkStatusBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // Track pending items
  const refreshPending = () => {
    syncQueue.getPendingCount().then(setPendingCount).catch(() => {});
  };

  useEffect(() => {
    refreshPending();
    const interval = setInterval(refreshPending, 10000); // Check every 10s

    // Listen to sync events
    const unsub1 = onSyncEvent('sync-start', () => setIsSyncing(true));
    const unsub2 = onSyncEvent('sync-complete', (data) => {
      setIsSyncing(false);
      if (data?.synced > 0) {
        setSyncResult(data);
        setTimeout(() => setSyncResult(null), 4000);
      }
      refreshPending();
    });
    const unsub3 = onSyncEvent('queue-changed', refreshPending);

    return () => { clearInterval(interval); unsub1(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowBackOnline(true);
        // Auto-sync when back online
        processQueue();
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

  // Show sync result toast briefly
  if (syncResult && syncResult.synced > 0) {
    return (
      <div className="sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium bg-emerald-500 text-white transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
        <Cloud size={14} />
        <span>✅ {syncResult.synced} data berhasil disinkronkan</span>
        {syncResult.failed > 0 && <span className="opacity-70">• {syncResult.failed} gagal</span>}
      </div>
    );
  }

  // Syncing in progress
  if (isSyncing && !isOffline) {
    return (
      <div className="sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium bg-blue-500 text-white transition-all duration-300">
        <Loader2 size={14} className="animate-spin" />
        <span>Menyinkronkan data offline...</span>
      </div>
    );
  }

  // Offline with pending items
  if (isOffline) {
    return (
      <div className="sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium bg-amber-500 text-white transition-all duration-300">
        <WifiOff size={14} />
        <span>Mode Offline — data tersimpan lokal</span>
        {pendingCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
            {pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  // Just came back online
  if (showBackOnline) {
    return (
      <div className="sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium bg-emerald-500 text-white transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
        <Wifi size={14} />
        <span>Koneksi kembali!</span>
        {pendingCount > 0 && (
          <span className="opacity-80">Menyinkronkan {pendingCount} item...</span>
        )}
      </div>
    );
  }

  // Online with pending items (sync might have failed earlier)
  if (pendingCount > 0) {
    return (
      <div className="sticky top-0 z-50 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-all duration-300">
        <Cloud size={12} />
        <span>{pendingCount} data menunggu sinkronisasi</span>
        <button
          onClick={() => processQueue()}
          className="ml-1 px-2 py-0.5 bg-orange-200 dark:bg-orange-800/40 rounded-full text-[10px] font-bold hover:bg-orange-300 dark:hover:bg-orange-800/60 active:scale-95 flex items-center gap-1"
        >
          <RefreshCw size={10} /> Sync
        </button>
      </div>
    );
  }

  return null;
};
