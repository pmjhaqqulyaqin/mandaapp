import { Request, Response } from 'express';
import * as systemService from './service';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const serveFileHandler = async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (filename.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to serve file', details: error.message });
  }
};

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
    const uploadedFile: Express.Multer.File | undefined = 
      req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalPath = uploadedFile.path;
    const parsedPath = path.parse(originalPath);
    let finalFilename = uploadedFile.filename;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(parsedPath.ext);

    if (isImage) {
      if (parsedPath.ext.toLowerCase() !== '.webp') {
        const webpFilename = `${parsedPath.name}.webp`;
        const webpPath = path.join(parsedPath.dir, webpFilename);

        await sharp(originalPath)
            .webp({ quality: 80, effort: 4 })
            .toFile(webpPath);

        fs.unlink(originalPath, (err) => {
          if (err) console.error("Failed to delete original system image after WebP conversion:", err);
        });

        finalFilename = webpFilename;
      }
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const effectiveProtocol = host?.includes('localhost') ? protocol : 'https';
    // Use the API route to serve the file so we can explicitly inject Content-Disposition: inline headers
    // bypassing any Nginx static location blocks that force octet-stream downloads.
    const fileUrl = `${effectiveProtocol}://${host}/api/system/file/${finalFilename}`;

    const filePathToStat = path.join(parsedPath.dir, finalFilename);

    res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        name: finalFilename,
        size: fs.statSync(filePathToStat).size
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
};
