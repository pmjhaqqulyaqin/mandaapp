import { Router } from 'express';
import * as systemController from './controller';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure storage
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.get('/status', systemController.getSystemStatus);
router.get('/check-updates', systemController.checkForUpdates);
router.post('/upload-update', upload.single('package'), systemController.uploadUpdatePackage);

// Generic image upload for Jodit/Editor
router.post('/upload/image', upload.single('image'), systemController.uploadImageHandler);

export const systemRoutes = router;
