import { Request, Response } from 'express';
import * as systemService from './service';

export const getSystemStatus = async (req: Request, res: Response) => {
  try {
    const status = await systemService.getSystemStatus();
    res.json(status);
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
