import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { integrationApps } from '../db/schema';
import { eq } from 'drizzle-orm';

/** Hash a key the same way the controller does */
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export const requireApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key is missing. Please provide x-api-key header.'
    });
  }

  try {
    const hashedKey = hashKey(apiKey);

    // 1) Try matching the SHA-256 hash (new keys)
    let app = await db.query.integrationApps.findFirst({
      where: eq(integrationApps.apiKey, hashedKey)
    });

    // 2) Fallback: try plain-text match (legacy keys created before hashing)
    if (!app) {
      app = await db.query.integrationApps.findFirst({
        where: eq(integrationApps.apiKey, apiKey)
      });

      // Auto-migrate legacy key to hashed version (fire-and-forget)
      if (app) {
        db.update(integrationApps)
          .set({ apiKey: hashedKey, updatedAt: new Date() })
          .where(eq(integrationApps.id, app.id))
          .then(() => console.log(`[API KEY] Migrated legacy key for app "${app!.name}" to SHA-256 hash`))
          .catch(() => { /* non-critical */ });
      }
    }

    if (!app) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key.'
      });
    }

    if (!app.isActive) {
      return res.status(403).json({
        success: false,
        message: 'API Key is inactive or has been revoked.'
      });
    }

    // Attach app info to request for later use if needed
    (req as any).integrationApp = app;
    next();
  } catch (error) {
    console.error('API Key validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};
