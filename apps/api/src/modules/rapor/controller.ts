import { Request, Response } from "express";
import * as raporService from "./service";

// ═══════════════════════════════════════════════════════════════
// e-Rapor Controller — Nilai Sumatif Kurikulum Merdeka
// ═══════════════════════════════════════════════════════════════

export class RaporController {

  // ── My Assignments (kelas/mapel dari jadwal mengajar) ──────

  static async getMyAssignments(req: Request, res: Response) {
    try {
      const { employeeId, semester } = req.query;
      if (!employeeId) {
        return res.status(400).json({ error: "employeeId wajib diisi" });
      }
      const result = await raporService.getMyTeachingAssignments(
        employeeId as string,
        semester as string | undefined,
      );
      res.json(result);
    } catch (error: any) {
      console.error("[Rapor] getMyAssignments error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ── Config ─────────────────────────────────────────────────

  static async getConfig(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester wajib diisi" });
      }
      const config = await raporService.getConfig(
        academicYearId as string,
        semester as string,
        classId as string | undefined,
        subjectId as string | undefined,
      );
      res.json(config);
    } catch (error: any) {
      console.error("[Rapor] getConfig error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async upsertConfig(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId, bobotTp, bobotSas, kktp } = req.body;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester wajib diisi" });
      }
      if (bobotTp + bobotSas !== 100) {
        return res.status(400).json({ error: "Total bobot TP + SAS harus = 100%" });
      }
      const result = await raporService.upsertConfig({
        academicYearId, semester,
        classId: classId || null,
        subjectId: subjectId || null,
        bobotTp, bobotSas, kktp,
      });
      res.json(result);
    } catch (error: any) {
      console.error("[Rapor] upsertConfig error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ── Tujuan Pembelajaran ────────────────────────────────────

  static async getTujuanPembelajaran(req: Request, res: Response) {
    try {
      const { academicYearId, semester, subjectId } = req.query;
      if (!academicYearId || !semester || !subjectId) {
        return res.status(400).json({ error: "academicYearId, semester, dan subjectId wajib diisi" });
      }
      const result = await raporService.getTujuanPembelajaran(
        academicYearId as string,
        semester as string,
        subjectId as string,
      );
      res.json(result);
    } catch (error: any) {
      console.error("[Rapor] getTujuanPembelajaran error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async upsertTujuanPembelajaran(req: Request, res: Response) {
    try {
      const { academicYearId, semester, subjectId, items } = req.body;
      if (!academicYearId || !semester || !subjectId || !items?.length) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await raporService.upsertTujuanPembelajaran({
        academicYearId, semester, subjectId, items,
      });
      res.json(result);
    } catch (error: any) {
      console.error("[Rapor] upsertTujuanPembelajaran error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteTujuanPembelajaran(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await raporService.deleteTujuanPembelajaran(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Rapor] deleteTujuanPembelajaran error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ── Nilai ──────────────────────────────────────────────────

  static async getNilai(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId } = req.query;
      if (!academicYearId || !semester || !classId || !subjectId) {
        return res.status(400).json({ error: "academicYearId, semester, classId, dan subjectId wajib diisi" });
      }
      const result = await raporService.getNilai({
        academicYearId: academicYearId as string,
        semester: semester as string,
        classId: classId as string,
        subjectId: subjectId as string,
      });
      res.json(result);
    } catch (error: any) {
      console.error("[Rapor] getNilai error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async saveNilai(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId, guruId, bobotTp, bobotSas, kktp, rows } = req.body;
      if (!academicYearId || !semester || !classId || !subjectId || !rows?.length) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await raporService.saveNilai({
        academicYearId, semester, classId, subjectId,
        guruId: guruId || null,
        bobotTp: bobotTp || 60,
        bobotSas: bobotSas || 40,
        kktp: kktp || 75,
        rows,
      });
      res.json({ success: true, count: result.length });
    } catch (error: any) {
      console.error("[Rapor] saveNilai error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async lockNilai(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId } = req.body;
      if (!academicYearId || !semester || !classId || !subjectId) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      await raporService.lockNilai({ academicYearId, semester, classId, subjectId });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Rapor] lockNilai error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async generateDescriptions(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId, kktp } = req.body;
      if (!academicYearId || !semester || !classId || !subjectId) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await raporService.generateDescriptions({
        academicYearId, semester, classId, subjectId, kktp: kktp || 75,
      });
      res.json(result);
    } catch (error: any) {
      console.error("[Rapor] generateDescriptions error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async exportCsv(req: Request, res: Response) {
    try {
      const { academicYearId, semester, classId, subjectId } = req.query;
      if (!academicYearId || !semester || !classId || !subjectId) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const csv = await raporService.exportCsv({
        academicYearId: academicYearId as string,
        semester: semester as string,
        classId: classId as string,
        subjectId: subjectId as string,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=Ledger_Nilai_eRapor.csv');
      // BOM for Excel UTF-8 compatibility
      res.send('\uFEFF' + csv);
    } catch (error: any) {
      console.error("[Rapor] exportCsv error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}
