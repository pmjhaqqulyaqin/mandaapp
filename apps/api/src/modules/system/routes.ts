import { Router } from 'express';
import * as systemController from './controller';
import { requireStaff, requireAdmin } from '../auth/middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { validateFilenameParam } from '../../middlewares/sanitize';
import rateLimit from 'express-rate-limit';

const router = Router();

// SEC-02: Dedicated rate limiter for public file serving (more permissive than API)
const fileRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Public
router.get('/status', systemController.getSystemStatus);

// Staff — image upload for Jodit/Editor
router.post('/upload/image', requireStaff, upload.any(), systemController.uploadImageHandler);

// Staff — serve files (SEC-01: validateFilenameParam + rate limit)
router.get('/file/:filename', fileRateLimiter, validateFilenameParam, systemController.serveFileHandler);

// Admin only — system updates
router.get('/check-updates', requireAdmin, systemController.checkForUpdates);
router.post('/sync-github', requireAdmin, systemController.syncGithubUpdate);
router.post('/upload-update', requireAdmin, upload.single('package'), systemController.uploadUpdatePackage);
router.post('/rollback', requireAdmin, systemController.rollbackUpdatePackage);

// Audit & Backup
router.get('/audit-logs', requireAdmin, systemController.getAuditLogs);
router.get('/backup', requireAdmin, systemController.downloadBackup);

export const systemRoutes = router;
