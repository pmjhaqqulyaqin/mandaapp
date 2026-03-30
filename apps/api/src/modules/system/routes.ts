import { Router } from 'express';
import * as systemController from './controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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

router.get('/status', systemController.getSystemStatus);
router.get('/check-updates', systemController.checkForUpdates);
router.post('/sync-github', systemController.syncGithubUpdate);
router.post('/upload-update', upload.single('package'), systemController.uploadUpdatePackage);
router.post('/rollback', systemController.rollbackUpdatePackage);

// Generic image upload for Jodit/Editor
router.post('/upload/image', upload.single('image'), systemController.uploadImageHandler);

export const systemRoutes = router;
