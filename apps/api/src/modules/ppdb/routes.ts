import { Router } from 'express';
import { PPDBController } from './controller';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ============ PUBLIC ENDPOINTS (no auth required) ============
router.get('/config', PPDBController.getConfig);
router.get('/jalur', PPDBController.getJalur);
router.post('/daftar', PPDBController.submitPendaftaran);
router.get('/status/:nisn/:noPendaftaran', PPDBController.checkStatus);
router.post('/upload', upload.single('file'), PPDBController.uploadFile);

// ============ ADMIN ENDPOINTS ============
router.get('/admin/stats', PPDBController.getAdminStats);
router.get('/admin/pendaftar', PPDBController.listPendaftar);
router.get('/admin/pendaftar/:id', PPDBController.getPendaftarDetail);
router.put('/admin/pendaftar/:id/status', PPDBController.updatePendaftarStatus);
router.get('/admin/jalur', PPDBController.getAllJalurAdmin);
router.put('/admin/jalur/:id', PPDBController.updateJalur);
router.get('/admin/export', PPDBController.exportPendaftar);
router.put('/admin/config/:id', PPDBController.updateConfig);
router.post('/admin/jalur/:jalurId/ranking', PPDBController.generateRanking);
router.post('/admin/jalur/:jalurId/kelulusan', PPDBController.tetapkanKelulusan);

export const ppdbRoutes = router;
