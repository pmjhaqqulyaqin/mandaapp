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
router.post('/daftar-ulang/:noPendaftaran', PPDBController.submitDaftarUlang);
router.get('/daftar-ulang/:noPendaftaran', PPDBController.getDaftarUlangInfo);
router.get('/verify/:code', PPDBController.verifyCode);

// ============ ADMIN ENDPOINTS ============
router.get('/admin/stats', PPDBController.getAdminStats);
router.get('/admin/pendaftar', PPDBController.listPendaftar);
router.get('/admin/pendaftar/:id', PPDBController.getPendaftarDetail);
router.put('/admin/pendaftar/:id/status', PPDBController.updatePendaftarStatus);
router.put('/admin/daftar-ulang/:id/status', PPDBController.updateDaftarUlangStatus);
router.get('/admin/jalur', PPDBController.getAllJalurAdmin);
router.put('/admin/jalur/:id', PPDBController.updateJalur);
router.get('/admin/export', PPDBController.exportPendaftar);
router.put('/admin/config/:id', PPDBController.updateConfig);
router.post('/admin/jalur/:jalurId/ranking', PPDBController.generateRanking);
router.post('/admin/jalur/:jalurId/kelulusan', PPDBController.tetapkanKelulusan);
router.get('/admin/daftar-ulang', PPDBController.listDaftarUlangAdmin);
router.post('/admin/brosur', upload.single('file'), PPDBController.uploadBrosur);

export const ppdbRoutes = router;
