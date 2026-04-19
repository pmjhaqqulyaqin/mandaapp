import { Router } from 'express';
import { ExamController } from './controller';
import { requireStaff } from '../auth/middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All exam management routes require staff auth
// Ujian (Master)
router.get('/', requireStaff, ExamController.getAllUjian);
router.get('/:id', requireStaff, ExamController.getUjianById);
router.post('/', requireStaff, ExamController.createUjian);
router.put('/:id', requireStaff, ExamController.updateUjian);
router.delete('/:id', requireStaff, ExamController.deleteUjian);

// Panitia
router.get('/:ujianId/panitia', requireStaff, ExamController.getPanitia);
router.post('/:ujianId/panitia', requireStaff, ExamController.addPanitia);
router.delete('/panitia/:id', requireStaff, ExamController.deletePanitia);

// Jadwal
router.get('/:ujianId/jadwal', requireStaff, ExamController.getJadwal);
router.post('/:ujianId/jadwal', requireStaff, ExamController.addJadwal);
router.put('/jadwal/:id', requireStaff, ExamController.updateJadwal);
router.delete('/jadwal/:id', requireStaff, ExamController.deleteJadwal);
router.post('/:ujianId/jadwal/upload', requireStaff, upload.single('file'), ExamController.importJadwal);
router.get('/:ujianId/jadwal/template', requireStaff, ExamController.downloadJadwalTemplate);
router.get('/:ujianId/jadwal/export', requireStaff, ExamController.exportJadwal);

// Ruang
router.get('/:ujianId/ruang', requireStaff, ExamController.getRuang);
router.post('/:ujianId/ruang', requireStaff, ExamController.addRuang);
router.put('/ruang/:id', requireStaff, ExamController.updateRuang);
router.delete('/ruang/:id', requireStaff, ExamController.deleteRuang);

// Pengawas
router.get('/:ujianId/pengawas', requireStaff, ExamController.getPengawas);
router.post('/:ujianId/pengawas', requireStaff, ExamController.addPengawas);
router.delete('/pengawas/:id', requireStaff, ExamController.deletePengawas);
router.post('/:ujianId/pengawas/generate', requireStaff, ExamController.generatePengawas);
router.get('/:ujianId/pengawas/export', requireStaff, ExamController.exportPengawas);

// Distribusi Peserta
router.get('/:ujianId/distribusi', requireStaff, ExamController.getDistribusi);
router.post('/:ujianId/distribusi/generate', requireStaff, ExamController.generateDistribusi);
router.delete('/:ujianId/distribusi', requireStaff, ExamController.clearDistribusi);
router.get('/:ujianId/distribusi/export', requireStaff, ExamController.exportDistribusi);
router.get('/:ujianId/daftar-hadir/export', requireStaff, ExamController.exportDaftarHadir);
router.get('/:ujianId/format-nilai/export', requireStaff, ExamController.exportFormatNilai);

export const examRoutes = router;
