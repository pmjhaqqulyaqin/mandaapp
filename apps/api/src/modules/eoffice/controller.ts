import { Request, Response } from 'express';
import { EOfficeService } from './service';

export class EOfficeController {
  
  static async getJenisSurat(req: Request, res: Response) {
    try {
      const result = await EOfficeService.getAllJenisSurat();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getSuratKeluar(req: Request, res: Response) {
    try {
      const result = await EOfficeService.geSuratKeluarList();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async generateNomorKeluar(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        userId: (req as any).user?.id || null // Assuming auth middleware attaches req.user
      };
      const result = await EOfficeService.generateNomor(data);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSuratMasuk(req: Request, res: Response) {
    try {
      const result = await EOfficeService.getSuratMasukList();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createSuratMasuk(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        tanggalSurat: new Date(req.body.tanggalSurat),
        userIdPenerima: (req as any).user?.id || null
      };
      const result = await EOfficeService.registerSuratMasuk(data);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async seedTemplates(req: Request, res: Response) {
    try {
      const result = await EOfficeService.seedTemplates();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async exportSuratKeluar(req: Request, res: Response) {
    try {
      const buffer = await EOfficeService.exportRekapSuratKeluar();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Rekap_Surat_Keluar.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async exportSuratMasuk(req: Request, res: Response) {
    try {
      const buffer = await EOfficeService.exportRekapSuratMasuk();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Rekap_Surat_Masuk.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
