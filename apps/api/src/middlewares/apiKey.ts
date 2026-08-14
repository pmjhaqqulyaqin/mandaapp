import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { integrationApps } from '../db/schema';
import { eq } from 'drizzle-orm';

export const requireApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key is missing. Please provide x-api-key header.'
    });
  }

  try {
    const app = await db.query.integrationApps.findFirst({
      where: eq(integrationApps.apiKey, apiKey)
    });

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
