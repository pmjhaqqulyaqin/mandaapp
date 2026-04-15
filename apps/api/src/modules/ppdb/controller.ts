import { Request, Response } from 'express';
import { PPDBService } from './service';
import { auth } from "../auth";
import { db } from '../../db';
import { user as userTable } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class PPDBController {

  // ============ PUBLIC ============

  static async getConfig(req: Request, res: Response) {
    try {
      const config = await PPDBService.getPublicConfig();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(config || { active: false, message: 'Belum ada konfigurasi PMB aktif' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getJalur(req: Request, res: Response) {
    try {
      const jalur = await PPDBService.getActiveJalur();
      res.json(jalur);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async submitPendaftaran(req: Request, res: Response) {
    try {
      const result = await PPDBService.submitPendaftaran(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async checkStatus(req: Request, res: Response) {
    try {
      const { nisn, noPendaftaran } = req.params;
      const result = await PPDBService.checkStatus(nisn, noPendaftaran);
      if (!result) return res.status(404).json({ error: 'Data pendaftaran tidak ditemukan' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
      const subdir = (req.query.type as string) || 'ppdb';
      const filePath = await PPDBService.uploadFile(req.file, `ppdb/${subdir}`);
      res.json({ filePath });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadBrosur(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: 'File brosur tidak ditemukan' });
      const filePath = await PPDBService.uploadFile(req.file, 'ppdb/brosur');
      const result = await PPDBService.saveBrosurUrl(filePath);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============ ADMIN ============

  static async getAdminStats(req: Request, res: Response) {
    try {
      const stats = await PPDBService.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listPendaftar(req: Request, res: Response) {
    try {
      const { jalurId, status, search, page, limit } = req.query;
      const result = await PPDBService.listPendaftar({
        jalurId: jalurId as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPendaftarDetail(req: Request, res: Response) {
    try {
      const result = await PPDBService.getPendaftarDetail(req.params.id);
      if (!result) return res.status(404).json({ error: 'Pendaftar tidak ditemukan' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePendaftarStatus(req: Request, res: Response) {
    try {
      const result = await PPDBService.updatePendaftarStatus(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateDaftarUlangStatus(req: Request, res: Response) {
    try {
      const result = await PPDBService.updateDaftarUlangStatus(req.params.id, req.body.status);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAllJalurAdmin(req: Request, res: Response) {
    try {
      const jalur = await PPDBService.getAllJalurAdmin();
      res.json(jalur);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateJalur(req: Request, res: Response) {
    try {
      const result = await PPDBService.updateJalur(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async exportPendaftar(req: Request, res: Response) {
    try {
      const data = await PPDBService.exportPendaftar(req.query.jalurId as string);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateConfig(req: Request, res: Response) {
    try {
      const result = await PPDBService.updateConfig(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async generateRanking(req: Request, res: Response) {
    try {
      const result = await PPDBService.generateRanking(req.params.jalurId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async tetapkanKelulusan(req: Request, res: Response) {
    try {
      const { jumlahCadangan } = req.body || {};
      const cadangan = parseInt(jumlahCadangan) || 0;
      const result = await PPDBService.tetapkanKelulusan(req.params.jalurId, cadangan);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async submitDaftarUlang(req: Request, res: Response) {
    try {
      const result = await PPDBService.submitDaftarUlang(req.params.noPendaftaran, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listDaftarUlangAdmin(req: Request, res: Response) {
    try {
      const result = await PPDBService.listDaftarUlangAdmin(req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getDaftarUlangInfo(req: Request, res: Response) {
    try {
      const data = await PPDBService.getDaftarUlangInfo(req.params.noPendaftaran);
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async verifyCode(req: Request, res: Response) {
    try {
      const result = await PPDBService.verifyValidationCode(req.params.code);
      if (!result) return res.status(404).json({ error: 'Kode validasi tidak ditemukan', valid: false });
      res.json({ valid: true, data: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message, valid: false });
    }
  }

  // ============ PENILAIAN TES ENDPOINTS ============

  static async getTesConfig(req: Request, res: Response) {
    try {
      const result = await PPDBService.getTesConfig(req.params.jalurId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createTesConfig(req: Request, res: Response) {
    try {
      const result = await PPDBService.createTesConfig(req.params.jalurId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateTesConfig(req: Request, res: Response) {
    try {
      const result = await PPDBService.updateTesConfig(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteTesConfig(req: Request, res: Response) {
    try {
      const result = await PPDBService.deleteTesConfig(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getPengujiTesList(req: Request, res: Response) {
    try {
      // Try session-based auth first, then fall back to X-User-Id header
      let userId: string | undefined;
      let userRole: string | undefined;
      
      try {
        const session = await auth.api.getSession({ headers: req.headers as any });
        if (session?.user) {
          userId = session.user.id;
          userRole = (session.user as any).role;
        }
      } catch { /* session auth failed, try header fallback */ }
      
      // Fallback to X-User-Id header (used by the frontend apiClient)
      if (!userId) {
        userId = req.headers['x-user-id'] as string;
      }
      
      if (!userId) throw new Error("Unauthorized");
      
      // If role not available from session, look it up from DB
      if (!userRole) {
        const found = await db.select({ role: userTable.role }).from(userTable).where(eq(userTable.id, userId)).limit(1);
        userRole = found[0]?.role || 'student';
      }
      
      const result = await PPDBService.getPengujiTesList(userId, userRole);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPesertaByTes(req: Request, res: Response) {
    try {
      const result = await PPDBService.getPesertaByTes(req.params.tesConfigId, req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkUpdateNilaiTes(req: Request, res: Response) {
    try {
      const result = await PPDBService.bulkUpdateNilaiTes(req.params.tesConfigId, req.body.data);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
