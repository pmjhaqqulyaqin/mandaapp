import { Router } from 'express';
import { EOfficeController } from './controller';
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

// E-Office Routes
router.get('/jenis-surat', EOfficeController.getJenisSurat);
router.post('/jenis-surat', EOfficeController.createJenisSurat);
router.delete('/jenis-surat/:id', EOfficeController.deleteJenisSurat);
router.post('/jenis-surat/seed', EOfficeController.seedTemplates);

router.get('/surat-keluar', EOfficeController.getSuratKeluar);
router.post('/surat-keluar/generate', EOfficeController.generateNomorKeluar);
router.get('/surat-keluar/export', EOfficeController.exportSuratKeluar);
router.delete('/surat-keluar/:id', EOfficeController.deleteSuratKeluar);
router.put('/surat-keluar/:id', EOfficeController.updateSuratKeluar);
router.put('/surat-keluar/:id/upload', upload.single('file'), EOfficeController.uploadSuratKeluar);

router.get('/surat-masuk', EOfficeController.getSuratMasuk);
router.post('/surat-masuk', EOfficeController.createSuratMasuk);
router.get('/surat-masuk/export', EOfficeController.exportSuratMasuk);
router.delete('/surat-masuk/:id', EOfficeController.deleteSuratMasuk);
router.put('/surat-masuk/:id', EOfficeController.updateSuratMasuk);
router.put('/surat-masuk/:id/upload', upload.single('file'), EOfficeController.uploadSuratMasuk);

router.get('/kka', EOfficeController.getKka);
router.post('/kka', EOfficeController.createKka);
router.delete('/kka/:id', EOfficeController.deleteKka);

export const eofficeRouter = router;
