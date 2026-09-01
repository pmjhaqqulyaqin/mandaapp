import { Request, Response, NextFunction } from 'express';

/**
 * PERF-07: Simple in-memory cache middleware for API responses.
 * Caches GET requests for endpoints that change infrequently
 * (settings, menus, pages) to reduce database hits.
 */

interface CacheEntry {
  data: any;
  headers: Record<string, string>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > 10 * 60 * 1000) { // Remove entries older than 10 min
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Cache middleware factory.
 * @param ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @param keyPrefix - Optional prefix for cache key namespace
 */
export function apiCache(ttlSeconds: number = 300, keyPrefix: string = '') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < ttlSeconds * 1000) {
      // Serve from cache
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', Math.round((Date.now() - cached.timestamp) / 1000).toString());

      // Restore original headers
      for (const [key, value] of Object.entries(cached.headers)) {
        res.setHeader(key, value);
      }

      return res.json(cached.data);
    }

    // Override res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data: body,
          headers: {
            'Content-Type': 'application/json',
          },
          timestamp: Date.now(),
        });
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate cache entries matching a prefix.
 * Call this when data is modified to ensure stale data isn't served.
 */
export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache entries.
 */
export function clearCache() {
  cache.clear();
}
