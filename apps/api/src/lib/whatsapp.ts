/**
 * Fonnte WhatsApp Gateway Client
 * 
 * API: POST https://api.fonnte.com/send
 * Auth: Device Token via Authorization header
 * 
 * Token resolution order:
 * 1. Database (site_settings.key = 'wa_fonnte_token') — set via admin dashboard
 * 2. Environment variable (WA_FONNTE_TOKEN) — fallback
 * 
 * Features:
 * - Rate limiter (2s antar pesan — ~30 pesan/menit)
 * - Retry logic (max 2x retry dengan exponential backoff)
 * - Circuit breaker (auto-stop jika 10 kegagalan berturut)
 * - Phone normalization (08xxx → 628xxx)
 */

import { db } from "../db";
import { siteSettings } from "../db/schema";
import { eq, or } from "drizzle-orm";

export interface WaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  detail?: string;
}

// ─── Phone Normalization ──────────────────────────────────

/**
 * Normalize nomor HP ke format internasional (628xxx).
 * Handles: +628xxx, 08xxx, 8xxx, 628xxx
 */
export function normalizePhone(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)\.+]/g, '');
  if (clean.startsWith('08')) clean = '62' + clean.slice(1);
  if (clean.startsWith('8') && clean.length >= 10) clean = '62' + clean;
  if (!clean.startsWith('62')) clean = '62' + clean;
  return clean;
}

// ─── Token Cache (DB-backed, refreshes every 60s) ─────────

let _cachedToken: string | null = null;
let _cachedTokenTs = 0;
const TOKEN_CACHE_TTL = 60_000; // 60 detik

/**
 * Resolve Fonnte token: DB first (admin dashboard), env fallback.
 */
async function resolveFonnteToken(): Promise<string | null> {
  // Return cached if still fresh
  if (_cachedToken && Date.now() - _cachedTokenTs < TOKEN_CACHE_TTL) {
    return _cachedToken;
  }

  try {
    const rows = await db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, 'wa_fonnte_token'))
      .limit(1);
    
    if (rows.length > 0 && rows[0].value && rows[0].value.trim().length > 5) {
      _cachedToken = rows[0].value.trim();
      _cachedTokenTs = Date.now();
      return _cachedToken;
    }
  } catch (err) {
    // DB might not be ready yet — fall back to env
    console.warn('[WA] Could not read token from DB, using env fallback');
  }

  // Fallback to env
  _cachedToken = process.env.WA_FONNTE_TOKEN || null;
  _cachedTokenTs = Date.now();
  return _cachedToken;
}

/** Force-refresh token cache (called when admin saves new token) */
export function invalidateTokenCache() {
  _cachedToken = null;
  _cachedTokenTs = 0;
}

// ─── Rate Limiter (In-Memory Queue) ───────────────────────

class WaQueue {
  private queue: Array<{
    fn: () => Promise<WaSendResult>;
    resolve: (r: WaSendResult) => void;
  }> = [];
  private processing = false;
  private readonly DELAY_MS = 2000; // 2 detik antar pesan

  enqueue(fn: () => Promise<WaSendResult>): Promise<WaSendResult> {
    return new Promise(resolve => {
      this.queue.push({ fn, resolve });
      this.process();
    });
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (err: any) {
        item.resolve({ success: false, error: err.message });
      }
      if (this.queue.length > 0) {
        await new Promise(r => setTimeout(r, this.DELAY_MS));
      }
    }
    this.processing = false;
  }

  get pendingCount() { return this.queue.length; }
}

// ─── Circuit Breaker ──────────────────────────────────────

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly THRESHOLD = 10;
  private readonly RESET_MS = 5 * 60_000; // 5 menit cooldown

  get isOpen(): boolean {
    if (this.failures >= this.THRESHOLD) {
      if (Date.now() - this.lastFailure > this.RESET_MS) {
        this.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() { this.failures = 0; }
  recordFailure() { this.failures++; this.lastFailure = Date.now(); }
}

const waQueue = new WaQueue();
const circuitBreaker = new CircuitBreaker();

// ─── Core: Kirim 1 Pesan via Fonnte API ───────────────────

async function sendToFonnte(phone: string, message: string): Promise<WaSendResult> {
  const token = await resolveFonnteToken();
  if (!token) {
    return { success: false, error: 'Fonnte token belum dikonfigurasi. Silakan isi di Dashboard Admin → Pengaturan WhatsApp.' };
  }

  const target = normalizePhone(phone);

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target,
      message,
      countryCode: '62',
    }),
  });

  const data = await res.json();

  if (data.status === true) {
    return {
      success: true,
      messageId: Array.isArray(data.id) ? data.id[0] : data.id,
      detail: data.detail,
    };
  }

  return {
    success: false,
    error: data.reason || data.detail || 'Unknown Fonnte error',
  };
}

// ─── Public API: Kirim WA (queued + retry + circuit breaker) ──

export async function sendWhatsApp(phone: string, message: string): Promise<WaSendResult> {
  const token = await resolveFonnteToken();
  if (!token) {
    return { success: false, error: 'Fonnte token belum dikonfigurasi' };
  }

  if (circuitBreaker.isOpen) {
    console.warn('[WA] ⚡ Circuit breaker OPEN — skipping');
    return { success: false, error: 'Circuit breaker open (too many failures)' };
  }

  return waQueue.enqueue(async () => {
    const MAX_RETRIES = 2;
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await sendToFonnte(phone, message);

        if (result.success) {
          circuitBreaker.recordSuccess();
          console.log(`[WA] ✅ Sent → ****${normalizePhone(phone).slice(-4)}`);
          return result;
        }

        lastError = result.error || 'Unknown';

        // Don't retry on auth/config errors — they won't resolve themselves
        if (lastError.includes('token invalid') || lastError.includes('device disconnected')) {
          circuitBreaker.recordFailure();
          return result;
        }

        console.warn(`[WA] ⚠️ Attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${lastError}`);
      } catch (err: any) {
        lastError = err.message;
      }

      // Exponential backoff before retry
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
      }
    }

    circuitBreaker.recordFailure();
    console.error(`[WA] ❌ All retries failed → ****${normalizePhone(phone).slice(-4)}: ${lastError}`);
    return { success: false, error: lastError };
  });
}

// ─── Status Info (untuk admin dashboard) ──────────────────

export async function getWaGatewayStatus() {
  const token = await resolveFonnteToken();
  return {
    configured: !!token,
    provider: 'Fonnte',
    queuePending: waQueue.pendingCount,
    circuitBreakerOpen: circuitBreaker.isOpen,
  };
}
