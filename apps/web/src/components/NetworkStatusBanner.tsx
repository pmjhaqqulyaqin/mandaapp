import { useState, useEffect, useRef, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, Loader2, CheckCircle2 } from 'lucide-react';
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
  const autoSyncTriggered = useRef(false);

  // Track pending items — memoized to avoid stale closures
  const refreshPending = useCallback(async () => {
    try {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    refreshPending();
    // Check more aggressively (every 3s) to keep UI responsive
    const interval = setInterval(refreshPending, 3000);

    // Listen to sync events
    const unsub1 = onSyncEvent('sync-start', () => setIsSyncing(true));
    const unsub2 = onSyncEvent('sync-complete', (data) => {
      setIsSyncing(false);
      if (data?.synced > 0) {
        setSyncResult(data);
        setTimeout(() => setSyncResult(null), 4000);
      }
      // Immediately refresh count after sync completes
      refreshPending();
    });
    const unsub3 = onSyncEvent('queue-changed', () => {
      // Refresh immediately + after a short delay (for DB transaction to settle)
      refreshPending();
      setTimeout(refreshPending, 500);
    });

    return () => { clearInterval(interval); unsub1(); unsub2(); unsub3(); };
  }, [refreshPending]);

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
      autoSyncTriggered.current = false; // Reset so auto-sync runs on next online
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Auto-trigger sync when we detect pending items and device is online
  // (handles the case where items accumulated from a previous session)
  useEffect(() => {
    if (pendingCount > 0 && !isOffline && !isSyncing && !autoSyncTriggered.current) {
      autoSyncTriggered.current = true;
      // Slight delay to let the UI settle
      const timer = setTimeout(() => {
        processQueue();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (pendingCount === 0) {
      autoSyncTriggered.current = false;
    }
  }, [pendingCount, isOffline, isSyncing]);

  // Manual sync handler with loading feedback
  const handleManualSync = async () => {
    if (isSyncing) return;
    autoSyncTriggered.current = true;
    await processQueue();
    // Force a final pending count refresh after all operations complete
    setTimeout(refreshPending, 1000);
  };

  // Show sync result toast briefly
  if (syncResult && syncResult.synced > 0) {
    return (
      <div className="sticky top-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium bg-emerald-500 text-white transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
        <CheckCircle2 size={14} />
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
        <span>Menyinkronkan {pendingCount > 0 ? `${pendingCount} ` : ''}data offline...</span>
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
          onClick={handleManualSync}
          disabled={isSyncing}
          className="ml-1 px-2 py-0.5 bg-orange-200 dark:bg-orange-800/40 rounded-full text-[10px] font-bold hover:bg-orange-300 dark:hover:bg-orange-800/60 active:scale-95 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} /> Sync
        </button>
      </div>
    );
  }

  return null;
};
