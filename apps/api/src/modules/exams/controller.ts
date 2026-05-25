import { Request, Response } from 'express';
import { ExamService } from './service';

export class ExamController {

  // ============ UJIAN ============

  static async getAllUjian(req: Request, res: Response) {
    try {
      const result = await ExamService.getAllUjian();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUjianById(req: Request, res: Response) {
    try {
      const result = await ExamService.getUjianById(req.params.id);
      if (!result) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createUjian(req: Request, res: Response) {
    try {
      const result = await ExamService.createUjian(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUjian(req: Request, res: Response) {
    try {
      const result = await ExamService.updateUjian(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteUjian(req: Request, res: Response) {
    try {
      await ExamService.deleteUjian(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============ PANITIA ============

  static async getPanitia(req: Request, res: Response) {
    try {
      const result = await ExamService.getPanitia(req.params.ujianId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addPanitia(req: Request, res: Response) {
    try {
      const result = await ExamService.addPanitia(req.params.ujianId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deletePanitia(req: Request, res: Response) {
    try {
      await ExamService.deletePanitia(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============ JADWAL ============

  static async getJadwal(req: Request, res: Response) {
    try {
      const result = await ExamService.getJadwal(req.params.ujianId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addJadwal(req: Request, res: Response) {
    try {
      const result = await ExamService.addJadwal(req.params.ujianId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateJadwal(req: Request, res: Response) {
    try {
      const result = await ExamService.updateJadwal(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteJadwal(req: Request, res: Response) {
    try {
      await ExamService.deleteJadwal(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async importJadwal(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
      const result = await ExamService.importJadwalFromExcel(req.params.ujianId, req.file.buffer);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async exportJadwal(req: Request, res: Response) {
    try {
      const buffer = await ExamService.exportJadwalExcel(req.params.ujianId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Jadwal_Ujian.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async downloadJadwalTemplate(req: Request, res: Response) {
    try {
      const buffer = await ExamService.downloadJadwalTemplateExcel(req.params.ujianId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Template_Jadwal_Ujian.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============ RUANG ============

  static async getRuang(req: Request, res: Response) {
    try {
      const result = await ExamService.getRuang(req.params.ujianId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addRuang(req: Request, res: Response) {
    try {
      const result = await ExamService.addRuang(req.params.ujianId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateRuang(req: Request, res: Response) {
    try {
      const result = await ExamService.updateRuang(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteRuang(req: Request, res: Response) {
    try {
      await ExamService.deleteRuang(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============ PENGAWAS ============

  static async getPengawas(req: Request, res: Response) {
    try {
      const result = await ExamService.getPengawas(req.params.ujianId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async addPengawas(req: Request, res: Response) {
    try {
      const result = await ExamService.addPengawas(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deletePengawas(req: Request, res: Response) {
    try {
      await ExamService.deletePengawas(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async generatePengawas(req: Request, res: Response) {
    try {
      const result = await ExamService.generatePengawas(req.params.ujianId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async exportPengawas(req: Request, res: Response) {
    try {
      const buffer = await ExamService.exportPengawasExcel(req.params.ujianId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Penugasan_Pengawas.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============ DISTRIBUSI ============

  static async getDistribusi(req: Request, res: Response) {
    try {
      const result = await ExamService.getDistribusi(req.params.ujianId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async generateDistribusi(req: Request, res: Response) {
    try {
      const { mode, kelasIds, roomAssignments } = req.body;
      const result = await ExamService.generateDistribusi(req.params.ujianId, mode || 'kelas', kelasIds, roomAssignments);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async clearDistribusi(req: Request, res: Response) {
    try {
      await ExamService.clearDistribusi(req.params.ujianId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async exportDistribusi(req: Request, res: Response) {
    try {
      const ruangId = req.query.ruangId as string | undefined;
      const buffer = await ExamService.exportDistribusiExcel(req.params.ujianId, ruangId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Distribusi_Peserta.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async exportDaftarHadir(req: Request, res: Response) {
    try {
      const type = req.query.type as string;
      const ruangId = req.query.ruangId as string | undefined;
      const kelasId = req.query.kelasId as string | undefined;

      let buffer: any;
      let filename = 'Daftar_Hadir.xlsx';

      if (type === 'pengawas') {
        buffer = await ExamService.exportDaftarHadirPengawasExcel(req.params.ujianId);
        filename = 'Daftar_Hadir_Pengawas.xlsx';
      } else if (type === 'panitia') {
        buffer = await ExamService.exportDaftarHadirPanitiaExcel(req.params.ujianId); 
        filename = 'Daftar_Hadir_Panitia.xlsx';
      } else if (type === 'kelas') {
        buffer = await ExamService.exportDaftarHadirPerKelasExcel(req.params.ujianId, kelasId);
        filename = 'Daftar_Hadir_Per_Kelas.xlsx';
      } else {
        buffer = await ExamService.exportDaftarHadirExcel(req.params.ujianId, ruangId);
        filename = 'Daftar_Hadir_Peserta.xlsx';
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async exportFormatNilai(req: Request, res: Response) {
    try {
      const mapel = req.query.mapel as string | undefined;
      const ruangId = req.query.ruangId as string | undefined;
      const buffer = await ExamService.exportFormatNilaiExcel(req.params.ujianId, mapel, ruangId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Format_Nilai.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
