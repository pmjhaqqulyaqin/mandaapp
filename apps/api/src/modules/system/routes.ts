import { Router } from 'express';
import * as systemController from './controller';
import multer from 'multer';
import path from 'path';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' });

router.get('/status', systemController.getSystemStatus);
router.get('/check-updates', systemController.checkForUpdates);
router.post('/upload-update', upload.single('package'), systemController.uploadUpdatePackage);

export const systemRoutes = router;
