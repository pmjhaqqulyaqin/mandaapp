/**
 * useNetworkStatus.ts — Hook for network status detection & sync state
 * 
 * Returns: { isOnline, pendingCount, isSyncing, lastSyncResult }
 * No banner — just data for icon indicators.
 */

import { useState, useEffect, useCallback } from 'react';
import { syncQueue } from '../lib/offlineDb';
import { onSyncEvent, processQueue } from '../lib/syncEngine';

interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: { synced: number; failed: number } | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // Track online/offline
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    try {
      const count = await syncQueue.getPendingCount();
      setPendingCount(count);
    } catch { /* IndexedDB not available */ }
  }, []);

  // Listen for sync events
  useEffect(() => {
    const unsub1 = onSyncEvent('sync-start', () => setIsSyncing(true));
    const unsub2 = onSyncEvent('sync-complete', (data) => {
      setIsSyncing(false);
      setLastSyncResult(data);
      refreshCount();
    });
    const unsub3 = onSyncEvent('queue-changed', () => refreshCount());

    // Initial count
    refreshCount();

    // Periodic refresh
    const interval = setInterval(refreshCount, 30000);

    return () => { unsub1(); unsub2(); unsub3(); clearInterval(interval); };
  }, [refreshCount]);

  return { isOnline, pendingCount, isSyncing, lastSyncResult };
}

/**
 * useManualSync — Trigger manual sync from UI
 */
export function useManualSync() {
  const [syncing, setSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return null;
    setSyncing(true);
    try {
      const result = await processQueue();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return { triggerSync, syncing };
}
