import { Router } from 'express';
import { PPDBController } from './controller';
import { requireStaff } from '../auth/middleware';
import multer from 'multer';
import path from 'path';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // SEC-05: Max 10MB
  fileFilter: (_req, file, cb) => {
    // SEC-05: Only allow images and PDF
    const allowed = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.test(path.extname(file.originalname)) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPG, PNG, WebP) dan PDF yang diizinkan'));
    }
  },
});

// ============ PUBLIC ENDPOINTS (no auth required) ============
router.get('/config', PPDBController.getConfig);
router.get('/jalur', PPDBController.getJalur);
router.post('/daftar', PPDBController.submitPendaftaran);
router.get('/status/:nisn/:noPendaftaran', PPDBController.checkStatus);
router.post('/upload', upload.single('file'), PPDBController.uploadFile);
router.post('/daftar-ulang/:noPendaftaran', PPDBController.submitDaftarUlang);
router.get('/daftar-ulang/:noPendaftaran', PPDBController.getDaftarUlangInfo);
router.get('/verify/:code', PPDBController.verifyCode);

// ============ ADMIN ENDPOINTS (staff auth required) ============
router.get('/admin/stats', requireStaff, PPDBController.getAdminStats);
router.get('/admin/pendaftar', requireStaff, PPDBController.listPendaftar);
router.get('/admin/pendaftar/:id', requireStaff, PPDBController.getPendaftarDetail);
router.put('/admin/pendaftar/:id/status', requireStaff, PPDBController.updatePendaftarStatus);
router.delete('/admin/pendaftar/:id', requireStaff, PPDBController.deletePendaftar);
router.put('/admin/daftar-ulang/:id/status', requireStaff, PPDBController.updateDaftarUlangStatus);
router.get('/admin/jalur', requireStaff, PPDBController.getAllJalurAdmin);
router.put('/admin/jalur/:id', requireStaff, PPDBController.updateJalur);
router.get('/admin/export', requireStaff, PPDBController.exportPendaftar);
router.get('/admin/pendaftar/export', requireStaff, PPDBController.exportPendaftar);
router.put('/admin/config/:id', requireStaff, PPDBController.updateConfig);
router.post('/admin/jalur/:jalurId/ranking', requireStaff, PPDBController.generateRanking);
router.post('/admin/jalur/:jalurId/kelulusan', requireStaff, PPDBController.tetapkanKelulusan);
router.get('/admin/daftar-ulang', requireStaff, PPDBController.listDaftarUlangAdmin);
router.post('/admin/brosur', requireStaff, upload.single('file'), PPDBController.uploadBrosur);

// ============ PENILAIAN TES & UJIAN ENDPOINTS (staff auth required) ============
router.get('/admin/tes-config/:jalurId', requireStaff, PPDBController.getTesConfig);
router.post('/admin/tes-config/:jalurId', requireStaff, PPDBController.createTesConfig);
router.put('/admin/tes-config/:id', requireStaff, PPDBController.updateTesConfig);
router.delete('/admin/tes-config/:id', requireStaff, PPDBController.deleteTesConfig);

router.get('/penguji/tes', requireStaff, PPDBController.getPengujiTesList);
router.get('/penguji/tes/:tesConfigId/peserta', requireStaff, PPDBController.getPesertaByTes);
router.put('/penguji/tes/:tesConfigId/nilai', requireStaff, PPDBController.bulkUpdateNilaiTes);

router.get('/penguji/master-penilaian', requireStaff, PPDBController.getMasterPenilaian);
router.put('/penguji/master-penilaian/bulk', requireStaff, PPDBController.bulkUpdateMasterNilaiTes);

export const ppdbRoutes = router;
