import { Router } from 'express';
import { EOfficeController } from './controller';

const router = Router();

// E-Office Routes
router.get('/jenis-surat', EOfficeController.getJenisSurat);
router.post('/jenis-surat/seed', EOfficeController.seedTemplates);

router.get('/surat-keluar', EOfficeController.getSuratKeluar);
router.post('/surat-keluar/generate', EOfficeController.generateNomorKeluar);
router.get('/surat-keluar/export', EOfficeController.exportSuratKeluar);

router.get('/surat-masuk', EOfficeController.getSuratMasuk);
router.post('/surat-masuk', EOfficeController.createSuratMasuk);
router.get('/surat-masuk/export', EOfficeController.exportSuratMasuk);

router.get('/kka', EOfficeController.getKka);
router.post('/kka', EOfficeController.createKka);

export const eofficeRouter = router;
