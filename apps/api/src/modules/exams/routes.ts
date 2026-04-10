import { Router } from 'express';
import { ExamController } from './controller';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ujian (Master)
router.get('/', ExamController.getAllUjian);
router.get('/:id', ExamController.getUjianById);
router.post('/', ExamController.createUjian);
router.put('/:id', ExamController.updateUjian);
router.delete('/:id', ExamController.deleteUjian);

// Panitia
router.get('/:ujianId/panitia', ExamController.getPanitia);
router.post('/:ujianId/panitia', ExamController.addPanitia);
router.delete('/panitia/:id', ExamController.deletePanitia);

// Jadwal
router.get('/:ujianId/jadwal', ExamController.getJadwal);
router.post('/:ujianId/jadwal', ExamController.addJadwal);
router.put('/jadwal/:id', ExamController.updateJadwal);
router.delete('/jadwal/:id', ExamController.deleteJadwal);
router.post('/:ujianId/jadwal/upload', upload.single('file'), ExamController.importJadwal);
router.get('/:ujianId/jadwal/export', ExamController.exportJadwal);

// Ruang
router.get('/:ujianId/ruang', ExamController.getRuang);
router.post('/:ujianId/ruang', ExamController.addRuang);
router.put('/ruang/:id', ExamController.updateRuang);
router.delete('/ruang/:id', ExamController.deleteRuang);

// Pengawas
router.get('/:ujianId/pengawas', ExamController.getPengawas);
router.post('/:ujianId/pengawas', ExamController.addPengawas);
router.delete('/pengawas/:id', ExamController.deletePengawas);
router.post('/:ujianId/pengawas/generate', ExamController.generatePengawas);
router.get('/:ujianId/pengawas/export', ExamController.exportPengawas);

// Distribusi Peserta
router.get('/:ujianId/distribusi', ExamController.getDistribusi);
router.post('/:ujianId/distribusi/generate', ExamController.generateDistribusi);
router.delete('/:ujianId/distribusi', ExamController.clearDistribusi);
router.get('/:ujianId/distribusi/export', ExamController.exportDistribusi);
router.get('/:ujianId/daftar-hadir/export', ExamController.exportDaftarHadir);

export const examRoutes = router;
