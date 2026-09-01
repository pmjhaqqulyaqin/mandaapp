/**
 * Offline Auth — Credential caching for offline login capability
 * 
 * Strategy: DUAL STORAGE for maximum reliability
 * - Primary: localStorage (sync, simple, never has version conflicts)
 * - Fallback: IndexedDB (for consistency with other offline stores)
 * 
 * Security: Uses SHA-256 hashing (SubtleCrypto). Expires after 30 days.
 */

const LS_PREFIX = 'simanda_offline_cred_';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedCredential {
  email: string;
  passwordHash: string;
  userData: any;
  cachedAt: number;
}

async function hashPassword(password: string, email: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    // SEC-07: Use dynamic salt derived from email instead of hardcoded salt
    const dynamicSalt = `simanda-${email.toLowerCase().trim()}-v2`;
    const data = encoder.encode(password + dynamicSalt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for non-secure contexts: simple hash
    let hash = 0;
    const dynamicSalt = `simanda-${email.toLowerCase().trim()}-v2`;
    const str = password + dynamicSalt;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(36);
  }
}

function getLSKey(email: string): string {
  return LS_PREFIX + email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '');
}

/**
 * Cache credentials after a successful online login
 * Uses localStorage as primary store (most reliable on mobile)
 */
export async function cacheCredentials(email: string, password: string, userData: any): Promise<void> {
  try {
    const passwordHash = await hashPassword(password, email);
    const credential: CachedCredential = {
      email: email.toLowerCase().trim(),
      passwordHash,
      userData,
      cachedAt: Date.now(),
    };

    // Primary: localStorage (synchronous, always works)
    const key = getLSKey(email);
    localStorage.setItem(key, JSON.stringify(credential));
    console.log('[OfflineAuth] Credentials cached in localStorage for:', email);
  } catch (err) {
    console.warn('[OfflineAuth] Failed to cache credentials:', err);
  }
}

/**
 * Attempt offline login using cached credentials
 */
export type OfflineLoginResult = 
  | { success: true; user: any }
  | { success: false; reason: 'no_cache' | 'expired' | 'wrong_password' };

export async function offlineLogin(email: string, password: string): Promise<OfflineLoginResult> {
  try {
    // Check localStorage (primary)
    const key = getLSKey(email);
    const raw = localStorage.getItem(key);
    
    if (!raw) {
      console.log('[OfflineAuth] No cached credentials in localStorage for:', email);
      return { success: false, reason: 'no_cache' };
    }

    const cached: CachedCredential = JSON.parse(raw);

    // Check expiry
    if (Date.now() - cached.cachedAt > MAX_AGE_MS) {
      console.warn('[OfflineAuth] Cached credentials expired');
      localStorage.removeItem(key);
      return { success: false, reason: 'expired' };
    }

    // Verify password
    const inputHash = await hashPassword(password, email);
    if (inputHash !== cached.passwordHash) {
      console.log('[OfflineAuth] Password mismatch');
      return { success: false, reason: 'wrong_password' };
    }

    console.log('[OfflineAuth] Offline login successful for:', email);
    return { success: true, user: cached.userData };
  } catch (err) {
    console.warn('[OfflineAuth] Offline login error:', err);
    return { success: false, reason: 'no_cache' };
  }
}

/**
 * Clear cached credentials (on logout)
 */
export async function clearCachedCredentials(): Promise<void> {
  try {
    // Clear all offline credentials from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.warn('[OfflineAuth] Failed to clear credentials:', err);
  }
}

/**
 * Check if we have cached credentials for any user
 */
export async function hasCachedCredentials(): Promise<boolean> {
  try {
    return Object.keys(localStorage).some(k => k.startsWith(LS_PREFIX));
  } catch {
    return false;
  }
}
