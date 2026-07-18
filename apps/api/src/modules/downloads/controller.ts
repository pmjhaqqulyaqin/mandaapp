import { Request, Response } from 'express';
import * as downloadsService from './service';
import path from 'path';
import fs from 'fs';

export const getPublicDownloadsHandler = async (req: Request, res: Response) => {
  try {
    const items = await downloadsService.getPublicDownloads();
    res.json(items);
  } catch (error) {
    console.error('Error fetching public downloads:', error);
    res.status(500).json({ error: 'Failed to fetch downloads' });
  }
};

export const getAdminDownloadsHandler = async (req: Request, res: Response) => {
  try {
    const { search, fileType, page, limit } = req.query;
    const result = await downloadsService.getAdminDownloads({
      search: search as string,
      fileType: fileType as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching admin downloads:', error);
    res.status(500).json({ error: 'Failed to fetch downloads' });
  }
};

export const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const stats = await downloadsService.getDownloadStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching download stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Detect category from file extension
function detectCategory(ext: string): string {
  const e = ext.toLowerCase();
  if (['.pdf'].includes(e)) return 'pdf_documents';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(e)) return 'archive';
  return 'project_assets';
}

// Detect file type from extension
function detectFileType(ext: string): string {
  const e = ext.toLowerCase();
  if (e === '.pdf') return 'pdf';
  if (['.doc', '.docx'].includes(e)) return 'docx';
  if (['.xls', '.xlsx'].includes(e)) return 'xlsx';
  if (['.ppt', '.pptx'].includes(e)) return 'pptx';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(e)) return 'zip';
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(e)) return 'img';
  if (e === '.apk') return 'apk';
  return 'pdf';
}

export const uploadHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname);
    const fileType = detectFileType(ext);
    const category = req.body.category || detectCategory(ext);
    const title = req.body.title || req.file.originalname;
    const description = req.body.description || '';

    const filePath = `/uploads/downloads/${req.file.filename}`;
    
    const newDownload = await downloadsService.createDownload({
      title,
      description,
      fileName: req.file.originalname,
      filePath,
      fileSize: req.file.size,
      fileType,
      category,
      isPublished: req.body.isPublished !== 'false',
      uploadedBy: req.authUser!.id,
    });

    res.status(201).json(newDownload);
  } catch (error: any) {
    console.error('Error uploading download:', error);
    res.status(500).json({ error: 'Upload failed', details: error?.message });
  }
};

export const updateHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await downloadsService.updateDownload(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Download not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating download:', error);
    res.status(500).json({ error: 'Failed to update download' });
  }
};

export const deleteHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await downloadsService.getDownloadById(id);
    if (!item) {
      return res.status(404).json({ error: 'Download not found' });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), item.filePath.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await downloadsService.deleteDownload(id);
    res.json({ success: true, message: 'Download deleted successfully' });
  } catch (error) {
    console.error('Error deleting download:', error);
    res.status(500).json({ error: 'Failed to delete download' });
  }
};

export const hitDownloadHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await downloadsService.incrementDownloadCount(id);
    if (!updated) {
      return res.status(404).json({ error: 'Download not found' });
    }
    res.json({ downloadCount: updated.downloadCount, filePath: updated.filePath });
  } catch (error) {
    console.error('Error incrementing download count:', error);
    res.status(500).json({ error: 'Failed to register download' });
  }
};
