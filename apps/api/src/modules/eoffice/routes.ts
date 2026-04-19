import { Router } from 'express';
import { EOfficeController } from './controller';
import { requireStaff } from '../auth/middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure storage for E-Office uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// All E-Office routes require staff auth
router.get('/jenis-surat', requireStaff, EOfficeController.getJenisSurat);
router.post('/jenis-surat', requireStaff, EOfficeController.createJenisSurat);
router.delete('/jenis-surat/:id', requireStaff, EOfficeController.deleteJenisSurat);
router.post('/jenis-surat/seed', requireStaff, EOfficeController.seedTemplates);

router.get('/surat-keluar', requireStaff, EOfficeController.getSuratKeluar);
router.post('/surat-keluar/generate', requireStaff, EOfficeController.generateNomorKeluar);
router.get('/surat-keluar/export', requireStaff, EOfficeController.exportSuratKeluar);
router.delete('/surat-keluar/:id', requireStaff, EOfficeController.deleteSuratKeluar);
router.put('/surat-keluar/:id', requireStaff, EOfficeController.updateSuratKeluar);
router.put('/surat-keluar/:id/upload', requireStaff, upload.single('file'), EOfficeController.uploadSuratKeluar);

router.get('/surat-masuk', requireStaff, EOfficeController.getSuratMasuk);
router.post('/surat-masuk', requireStaff, EOfficeController.createSuratMasuk);
router.get('/surat-masuk/export', requireStaff, EOfficeController.exportSuratMasuk);
router.delete('/surat-masuk/:id', requireStaff, EOfficeController.deleteSuratMasuk);
router.put('/surat-masuk/:id', requireStaff, EOfficeController.updateSuratMasuk);
router.put('/surat-masuk/:id/upload', requireStaff, upload.single('file'), EOfficeController.uploadSuratMasuk);

router.get('/kka', requireStaff, EOfficeController.getKka);
router.post('/kka', requireStaff, EOfficeController.createKka);
router.delete('/kka/:id', requireStaff, EOfficeController.deleteKka);

export const eofficeRouter = router;
