import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getPublicDownloadsHandler,
  getAdminDownloadsHandler,
  getStatsHandler,
  uploadHandler,
  updateHandler,
  deleteHandler,
  hitDownloadHandler,
} from './controller';
import { requireStaff } from '../auth/middleware';

const router = Router();

// Ensure downloads upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'downloads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `dl_${Date.now()}_${safeName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|tar|gz|png|jpg|jpeg|svg|webp|apk)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan. Format yang didukung: PDF, DOC, XLS, PPT, ZIP, RAR, gambar, APK'));
    }
  },
});

// Public routes
router.get('/', getPublicDownloadsHandler);
router.post('/:id/hit', hitDownloadHandler);

// Protected routes (staff only)
router.get('/admin', requireStaff, getAdminDownloadsHandler);
router.get('/stats', requireStaff, getStatsHandler);
router.post('/upload', requireStaff, upload.single('file'), uploadHandler);
router.patch('/:id', requireStaff, updateHandler);
router.delete('/:id', requireStaff, deleteHandler);

export const downloadsRoutes = router;
