import { Request, Response } from 'express';
import { EOfficeService } from './service';
import { auth } from '../auth';
import { fromNodeHeaders } from 'better-auth/node';

export class EOfficeController {
  
  static async getJenisSurat(req: Request, res: Response) {
    try {
      const result = await EOfficeService.getAllJenisSurat();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createJenisSurat(req: Request, res: Response) {
    try {
      const result = await EOfficeService.createJenisSurat(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteJenisSurat(req: Request, res: Response) {
    try {
      await EOfficeService.deleteJenisSurat(req.params.id);
      res.json({ success: true });
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
      // Get session from better-auth
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      const userId = session?.user.id || (req.headers['x-user-id'] as string) || null;
      
      const data = {
        ...req.body,
        userId: userId
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
      // Get session from better-auth
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      const userId = session?.user.id || (req.headers['x-user-id'] as string) || null;

      const data = {
        ...req.body,
        tanggalSurat: new Date(req.body.tanggalSurat),
        userIdPenerima: userId
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

  static async getKka(req: Request, res: Response) {
    try {
      const result = await EOfficeService.getAllKka();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createKka(req: Request, res: Response) {
    try {
      const result = await EOfficeService.createKka(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteKka(req: Request, res: Response) {
    try {
      await EOfficeService.deleteKka(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteSuratKeluar(req: Request, res: Response) {
    try {
      await EOfficeService.deleteSuratKeluar(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadSuratKeluar(req: Request, res: Response) {
    try {
      await EOfficeService.uploadSuratKeluar(req.params.id, req.file);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSuratKeluar(req: Request, res: Response) {
    try {
      await EOfficeService.updateSuratKeluar(req.params.id, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteSuratMasuk(req: Request, res: Response) {
    try {
      await EOfficeService.deleteSuratMasuk(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadSuratMasuk(req: Request, res: Response) {
    try {
      await EOfficeService.uploadSuratMasuk(req.params.id, req.file);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateSuratMasuk(req: Request, res: Response) {
    try {
      await EOfficeService.updateSuratMasuk(req.params.id, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
