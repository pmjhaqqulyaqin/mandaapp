/**
 * syncEngine.ts — Background sync manager for offline-first operations
 * 
 * Responsibilities:
 * - Enqueue write operations (attendance scans, jurnal entries)
 * - Process queue when online (auto-retry with exponential backoff)
 * - Emit events for UI updates (sync progress, completion)
 * - Register Background Sync via Service Worker
 * 
 * Performance: Uses in-memory student index for instant offline lookups,
 * fire-and-forget log writes, and non-blocking queue operations.
 */

import { syncQueue, cachedData, offlineLog, type SyncItemType, type SyncQueueItem } from './offlineDb';
import { apiClient } from './api';

// ── Event System ──
type SyncEventType = 'sync-start' | 'sync-progress' | 'sync-complete' | 'sync-error' | 'queue-changed';
type SyncEventCallback = (data: any) => void;

const listeners = new Map<SyncEventType, Set<SyncEventCallback>>();

export function onSyncEvent(event: SyncEventType, callback: SyncEventCallback): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(callback);
  return () => listeners.get(event)?.delete(callback);
}

function emit(event: SyncEventType, data?: any) {
  listeners.get(event)?.forEach(cb => cb(data));
}

// ── API Endpoint Mapping ──
const ENDPOINT_MAP: Record<SyncItemType, { url: string; method: string }> = {
  attendance_scan: { url: '/attendance/scan', method: 'POST' },
  jurnal_create: { url: '/jurnal/entries', method: 'POST' },
  jurnal_submit: { url: '/jurnal/entries/{id}/submit', method: 'PUT' },
  jurnal_attachment: { url: '/jurnal/attachments', method: 'POST' },
};

// ── In-Memory Student Index for Instant Lookups ──
let studentIndex: Map<string, { id: string; nis: string; fullName: string; className?: string }> | null = null;

function buildStudentIndex(students: Array<{ id: string; nis: string; fullName: string; className?: string }>) {
  studentIndex = new Map();
  for (const s of students) {
    studentIndex.set(s.nis, s);
  }
}

// ── Smart Send (core function) ──
export interface SmartSendResult {
  success: boolean;
  result: any;
  fromCache: boolean;
  queueId: number | null;
}

/**
 * smartSend — Always succeeds locally. Syncs to server when possible.
 * 
 * Flow:
 * 1. Save to IndexedDB queue (instant, always works)
 * 2. If online, attempt immediate sync
 * 3. If offline or sync fails, leave in queue for background sync
 * 
 * Performance: offlineLog.add is fire-and-forget to avoid blocking the scan response.
 */
export async function smartSend(
  type: SyncItemType,
  payload: any,
  logSummary?: string
): Promise<SmartSendResult> {
  // 1. Always save to queue first
  const queueId = await syncQueue.add(type, {
    ...payload,
    _offlineTimestamp: Date.now(),
  });
  emit('queue-changed');

  // Fire-and-forget: add to offline log (don't await — non-critical for scan response)
  if (logSummary) {
    offlineLog.add(type, logSummary).catch(() => {});
  }

  // 2. Try immediate sync if online
  if (navigator.onLine) {
    try {
      const result = await sendToServer(type, payload);
      // Fire-and-forget: mark synced
      syncQueue.markSynced(queueId).then(() => emit('queue-changed')).catch(() => {});
      return { success: true, result, fromCache: false, queueId };
    } catch (error) {
      // Failed to send — leave in queue, will retry later
      console.warn(`[SyncEngine] Immediate sync failed for ${type}, queued for later`, error);
      return { success: true, result: null, fromCache: true, queueId };
    }
  }

  // 3. Offline — register for background sync (fire-and-forget)
  registerBackgroundSync(type).catch(() => {});
  return { success: true, result: null, fromCache: true, queueId };
}

// ── Send to Server ──
async function sendToServer(type: SyncItemType, payload: any): Promise<any> {
  const endpoint = ENDPOINT_MAP[type];
  if (!endpoint) throw new Error(`Unknown sync type: ${type}`);

  let url = endpoint.url;
  
  // Handle dynamic URL params (e.g., jurnal_submit needs entry ID)
  if (type === 'jurnal_submit' && payload.entryId) {
    url = url.replace('{id}', payload.entryId);
  }

  // Handle file uploads (jurnal_attachment)
  if (type === 'jurnal_attachment' && payload._formData) {
    const formData = new FormData();
    Object.entries(payload._formData).forEach(([key, value]) => {
      formData.append(key, value as any);
    });
    return apiClient(url, { method: endpoint.method, data: formData });
  }

  // Remove internal fields before sending
  const cleanPayload = { ...payload };
  delete cleanPayload._offlineTimestamp;
  delete cleanPayload._formData;

  return apiClient(url, {
    method: endpoint.method,
    data: cleanPayload,
  });
}

// ── Process Queue (called when back online) ──
let isProcessing = false;

export async function processQueue(): Promise<{ synced: number; failed: number }> {
  if (isProcessing) return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  isProcessing = true;
  emit('sync-start');

  let synced = 0;
  let failed = 0;

  try {
    const pending = await syncQueue.getPending();
    const retryable = (await syncQueue.getFailed()).filter(item => item.retryCount < 5);
    const allItems = [...pending, ...retryable].sort((a, b) => a.createdAt - b.createdAt);

    for (const item of allItems) {
      if (!navigator.onLine) break; // Stop if we go offline again

      try {
        await syncQueue.markSyncing(item.id!);
        await sendToServer(item.type, item.payload);
        await syncQueue.markSynced(item.id!);
        synced++;
        emit('sync-progress', { synced, total: allItems.length, current: item });
      } catch (error: any) {
        await syncQueue.markFailed(item.id!, error.message || 'Unknown error');
        failed++;
      }

      // Small delay between requests to avoid server overload
      await new Promise(r => setTimeout(r, 200));
    }

    // Clean up synced items
    await syncQueue.clearSynced();
    await offlineLog.markAllSynced();

    // Purge expired data
    await syncQueue.purgeExpired();
    await offlineLog.purge();

  } finally {
    isProcessing = false;
    emit('sync-complete', { synced, failed });
    emit('queue-changed');
  }

  return { synced, failed };
}

// ── Background Sync Registration ──
async function registerBackgroundSync(type: SyncItemType) {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration && 'sync' in registration) {
      const tag = type.startsWith('attendance') ? 'sync-attendance' : 'sync-jurnal';
      await (registration as any).sync.register(tag);
      console.log(`[SyncEngine] Background sync registered: ${tag}`);
    }
  } catch (error) {
    // Background Sync not supported — rely on online event fallback
    console.warn('[SyncEngine] Background Sync not available, using fallback');
  }
}

// ── Online/Offline Event Listeners ──
let onlineRetryTimeout: ReturnType<typeof setTimeout> | null = null;

export function initSyncListeners() {
  window.addEventListener('online', () => {
    console.log('[SyncEngine] Back online — processing queue in 2s...');
    // Small delay to let connection stabilize
    if (onlineRetryTimeout) clearTimeout(onlineRetryTimeout);
    onlineRetryTimeout = setTimeout(() => {
      processQueue();
    }, 2000);
  });

  window.addEventListener('offline', () => {
    console.log('[SyncEngine] Gone offline');
    if (onlineRetryTimeout) {
      clearTimeout(onlineRetryTimeout);
      onlineRetryTimeout = null;
    }
  });

  // Periodic check: try to sync every 5 minutes if online
  setInterval(() => {
    if (navigator.onLine) {
      syncQueue.getPendingCount().then(count => {
        if (count > 0) {
          console.log(`[SyncEngine] Periodic sync check: ${count} items pending`);
          processQueue();
        }
      });
    }
  }, 5 * 60 * 1000);

  // Initial sync on page load if there are pending items
  setTimeout(() => {
    if (navigator.onLine) {
      syncQueue.getPendingCount().then(count => {
        if (count > 0) processQueue();
      });
    }
  }, 3000);
}

// ── Cache Helpers for Offline Data ──
export const offlineCache = {
  /** Cache student list for offline NIS lookup — also builds in-memory index */
  async cacheStudents(students: Array<{ id: string; nis: string; fullName: string; className?: string }>): Promise<void> {
    // Build in-memory index first (instant lookups)
    buildStudentIndex(students);
    // Then persist to IndexedDB (for next session reload)
    await cachedData.set('students', students, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
  },

  /** Look up student by NIS — uses in-memory index (O(1)) with IndexedDB fallback */
  async lookupStudent(nis: string): Promise<{ id: string; nis: string; fullName: string; className?: string } | null> {
    // 1. Check in-memory index first (instant)
    if (studentIndex) {
      const found = studentIndex.get(nis);
      if (found) return found;
    }

    // 2. Fallback: load from IndexedDB and rebuild index
    const students = await cachedData.get<Array<{ id: string; nis: string; fullName: string; className?: string }>>('students');
    if (!students) return null;
    
    // Rebuild index for next time
    buildStudentIndex(students);
    return studentIndex?.get(nis) || null;
  },

  /** Cache today's schedule */
  async cacheScheduleToday(schedule: any[]): Promise<void> {
    await cachedData.set('schedule_today', schedule, 24 * 60 * 60 * 1000); // 1 day TTL
  },

  /** Get cached schedule */
  async getScheduleToday(): Promise<any[] | null> {
    return cachedData.get<any[]>('schedule_today');
  },

  /** Cache class students */
  async cacheClassStudents(classId: string, students: any[]): Promise<void> {
    await cachedData.set(`class_students_${classId}`, students, 24 * 60 * 60 * 1000);
  },

  /** Get cached class students */
  async getClassStudents(classId: string): Promise<any[] | null> {
    return cachedData.get<any[]>(`class_students_${classId}`);
  },
};
