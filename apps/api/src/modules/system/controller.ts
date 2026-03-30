import { Request, Response } from 'express';
import * as systemService from './service';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const getSystemStatus = async (req: Request, res: Response) => {
  try {
    const status = await systemService.getSystemStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const syncGithubUpdate = async (req: Request, res: Response) => {
  try {
    const result = await systemService.syncGithubUpdate();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkForUpdates = async (req: Request, res: Response) => {
  try {
    const updateInfo = await systemService.checkForUpdates();
    res.json(updateInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadUpdatePackage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await systemService.processUpdatePackage(req.file.path);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const rollbackUpdatePackage = async (req: Request, res: Response) => {
  try {
    const result = await systemService.rollbackUpdatePackage();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadImageHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Convert to WebP
    const originalPath = req.file.path;
    const parsedPath = path.parse(originalPath);
    const webpFilename = `${parsedPath.name}.webp`;
    const webpPath = path.join(parsedPath.dir, webpFilename);

    await sharp(originalPath)
        .webp({ quality: 80, effort: 4 })
        .toFile(webpPath);

    fs.unlink(originalPath, (err) => {
      if (err) console.error("Failed to delete original system image after WebP conversion:", err);
    });

    const protocol = req.protocol;
    const host = req.get('host');
    const effectiveProtocol = host?.includes('localhost') ? protocol : 'https';
    const fileUrl = `${effectiveProtocol}://${host}/uploads/${webpFilename}`;

    res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        name: webpFilename,
        size: fs.statSync(webpPath).size
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
};
