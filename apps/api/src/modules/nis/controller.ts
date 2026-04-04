import { Request, Response } from "express";
import { NISService } from "./service";
import * as xlsx from "xlsx";

export class NISController {
  // GET /api/nis/stats
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await NISService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
  }

  // GET /api/nis/academic-years
  static async getAcademicYears(req: Request, res: Response) {
    try {
      const years = await NISService.getAcademicYears();
      res.json(years);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch academic years" });
    }
  }

  // POST /api/nis/academic-years
  static async createAcademicYear(req: Request, res: Response) {
    try {
      const { tahunAjaran, kodeTahun, tanggalMulai, tanggalSelesai, isActive } = req.body;
      if (!tahunAjaran || !kodeTahun || !tanggalMulai || !tanggalSelesai) {
        return res.status(400).json({ error: "Semua field wajib diisi" });
      }
      const year = await NISService.createAcademicYear({
        tahunAjaran, kodeTahun, tanggalMulai, tanggalSelesai, isActive
      });
      res.status(201).json(year);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create academic year" });
    }
  }

  // PUT /api/nis/academic-years/:id/activate
  static async activateYear(req: Request, res: Response) {
    try {
      const year = await NISService.setActiveYear(req.params.id);
      res.json(year);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to activate year" });
    }
  }

  // GET /api/nis/recent-activity
  static async getRecentActivity(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await NISService.getRecentActivity(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch activity" });
    }
  }

  // GET /api/nis/students-without-nis
  static async getStudentsWithoutNIS(req: Request, res: Response) {
    try {
      const students = await NISService.getStudentsWithoutNIS();
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch students" });
    }
  }

  // POST /api/nis/preview-batch
  static async previewBatch(req: Request, res: Response) {
    try {
      const { studentIds, academicYearId } = req.body;
      if (!studentIds || !academicYearId) {
        return res.status(400).json({ error: "studentIds dan academicYearId wajib" });
      }
      const preview = await NISService.previewBatchNIS(studentIds, academicYearId);
      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to preview batch" });
    }
  }

  // POST /api/nis/generate-batch
  static async generateBatch(req: Request, res: Response) {
    try {
      const { studentIds, academicYearId } = req.body;
      const operatorId = req.headers['x-user-id'] as string;
      if (!studentIds || !academicYearId) {
        return res.status(400).json({ error: "studentIds dan academicYearId wajib" });
      }
      const result = await NISService.generateBatchNIS(academicYearId, studentIds, operatorId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate batch" });
    }
  }

  // POST /api/nis/upload-batch — Upload CSV/Excel, parse, return student list
  static async uploadBatch(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(worksheet);

      const parsed = data.map((row) => {
        let parsedDate: string | null = null;
        const rawDate = row['Tanggal Lahir'] || row.TanggalLahir || row.Tgl_Lahir;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
        }

        return {
          fullName: row.Nama || row.NamaSiswa || row.Name || row['Nama Lengkap'] || '',
          nisn: String(row.NISN || ''),
          gender: row['Jenis Kelamin'] || row.JenisKelamin || row.Jenis_Kelamin || '',
          birthPlace: row['Tempat Lahir'] || row.TempatLahir || '',
          birthDate: parsedDate,
          asalSekolah: row['Asal Sekolah'] || row.Asal || '',
        };
      }).filter(r => r.fullName.trim() !== '');

      // Check for duplicates within the uploaded data
      const nameSet = new Map<string, number>();
      const duplicates: string[] = [];
      parsed.forEach(p => {
        const key = p.fullName.trim().toLowerCase();
        nameSet.set(key, (nameSet.get(key) || 0) + 1);
      });
      nameSet.forEach((count, name) => {
        if (count > 1) duplicates.push(name);
      });

      res.json({
        totalRows: parsed.length,
        duplicates,
        duplicateCount: duplicates.length,
        students: parsed
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to parse file" });
    }
  }

  // GET /api/nis/next-sequence?academicYearId=xxx
  static async getNextSequence(req: Request, res: Response) {
    try {
      const academicYearId = req.query.academicYearId as string;
      if (!academicYearId) {
        return res.status(400).json({ error: "academicYearId wajib" });
      }
      const result = await NISService.getNextSequence(academicYearId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get next sequence" });
    }
  }

  // POST /api/nis/assign-single
  static async assignSingle(req: Request, res: Response) {
    try {
      const operatorId = req.headers['x-user-id'] as string;
      const result = await NISService.assignSingleNIS(req.body, operatorId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to assign NIS" });
    }
  }

  // GET /api/nis/records
  static async getRecords(req: Request, res: Response) {
    try {
      const result = await NISService.getAllRecords({
        search: req.query.search as string,
        status: req.query.status as string,
        yearCode: req.query.yearCode as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch records" });
    }
  }

  // PUT /api/nis/records/:id
  static async editRecord(req: Request, res: Response) {
    try {
      const operatorId = req.headers['x-user-id'] as string;
      const { nis } = req.body;
      if (!nis) return res.status(400).json({ error: "NIS wajib" });
      const result = await NISService.editNIS(req.params.id, nis, operatorId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to edit NIS" });
    }
  }

  // DELETE /api/nis/records/:id/revoke
  static async revokeRecord(req: Request, res: Response) {
    try {
      const operatorId = req.headers['x-user-id'] as string;
      const deleteProfile = req.query.deleteProfile === 'true';
      const result = await NISService.revokeNIS(req.params.id, deleteProfile, operatorId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to revoke NIS" });
    }
  }

  // GET /api/nis/export
  static async exportRecords(req: Request, res: Response) {
    try {
      const result = await NISService.getAllRecords({
        search: req.query.search as string,
        status: req.query.status as string,
        yearCode: req.query.yearCode as string,
        page: 1,
        limit: 99999,
      });

      const data = result.records.map((s, idx) => ({
        'No': idx + 1,
        'NIS': s.nis || '-',
        'Nama Lengkap': s.fullName || '-',
        'NISN': s.nisn || '-',
        'Kelas': s.className || '-',
        'Jenis Kelamin': s.gender || '-',
        'Status': s.status || '-',
      }));

      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Daftar NIS");

      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Daftar_NIS.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to export" });
    }
  }

  // GET /api/nis/check-duplicate/:nis
  static async checkDuplicate(req: Request, res: Response) {
    try {
      const result = await NISService.checkDuplicate(req.params.nis);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check duplicate" });
    }
  }

  // GET /api/nis/batch-history
  static async getBatchHistory(req: Request, res: Response) {
    try {
      const batches = await NISService.getBatchHistory();
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch batch history" });
    }
  }
}
