import { Request, Response } from "express";
import { AttendanceService } from "./service";

export class AttendanceController {

  // ─── Public Scan (NO AUTH - for gate scanner) ───────────────────────────

  static async scan(req: Request, res: Response) {
    try {
      const { nis, jenis = "masuk", method = "qr_scan", timestamp } = req.body;
      if (!nis || String(nis).trim().length < 2) {
        return res.status(400).json({ success: false, message: "NIS kosong" });
      }

      // timestamp: original scan time from offline queue (epoch ms)
      const offlineTimestamp = typeof timestamp === 'number' ? timestamp : undefined;

      const result = await AttendanceService.processScan(
        String(nis).trim(),
        jenis === "pulang" ? "pulang" : "masuk",
        method,
        undefined, // no auth user for public scanner
        offlineTimestamp
      );

      return res.json(result);
    } catch (error: any) {
      console.error("[ATTENDANCE] Scan error:", error);
      return res.status(500).json({ success: false, message: "Error server" });
    }
  }

  // ─── Manual Input (AUTH REQUIRED) ───────────────────────────────────────

  static async manualInput(req: Request, res: Response) {
    try {
      const { studentId, date, status, note } = req.body;
      if (!studentId || !date || !status) {
        return res.status(400).json({ success: false, message: "Data tidak lengkap" });
      }

      const result = await AttendanceService.manualInput({
        studentId,
        date,
        status,
        note,
        recordedBy: req.authUser!.id,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("[ATTENDANCE] Manual input error:", error);
      return res.status(500).json({ success: false, message: "Error server" });
    }
  }

  static async manualBulkInput(req: Request, res: Response) {
    try {
      const { records, date } = req.body;
      if (!records || !Array.isArray(records) || !date) {
        return res.status(400).json({ success: false, message: "Data tidak lengkap" });
      }

      const result = await AttendanceService.manualBulkInput({
        records,
        date,
        recordedBy: req.authUser!.id,
      });

      return res.json(result);
    } catch (error: any) {
      console.error("[ATTENDANCE] Bulk manual input error:", error);
      return res.status(500).json({ success: false, message: "Error server" });
    }
  }

  // ─── Stats Today ────────────────────────────────────────────────────────

  static async getStatsToday(req: Request, res: Response) {
    try {
      const classId = req.query.classId as string | undefined;
      const stats = await AttendanceService.getStatsToday(classId);
      return res.json(stats);
    } catch (error: any) {
      console.error("[ATTENDANCE] Stats error:", error);
      return res.status(500).json({ error: "Gagal mengambil statistik" });
    }
  }

  // ─── Weekly Stats ─────────────────────────────────────────────────────────

  static async getWeeklyStats(req: Request, res: Response) {
    try {
      const classId = req.query.classId as string | undefined;
      const stats = await AttendanceService.getWeeklyStats(classId);
      return res.json(stats);
    } catch (error: any) {
      console.error("[ATTENDANCE] Weekly stats error:", error);
      return res.status(500).json({ error: "Gagal mengambil statistik mingguan" });
    }
  }

  // ─── Log Today ──────────────────────────────────────────────────────────

  static async getLogToday(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const log = await AttendanceService.getLogToday(limit);
      return res.json(log);
    } catch (error: any) {
      console.error("[ATTENDANCE] Log error:", error);
      return res.status(500).json({ error: "Gagal mengambil log" });
    }
  }

  // ─── Recap Daily ────────────────────────────────────────────────────────

  static async getRecapDaily(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const classId = req.query.classId as string | undefined;
      const recap = await AttendanceService.getRecapDaily(date, classId);
      return res.json(recap);
    } catch (error: any) {
      console.error("[ATTENDANCE] Recap daily error:", error);
      return res.status(500).json({ error: "Gagal mengambil rekap harian" });
    }
  }

  // ─── Recap Monthly ─────────────────────────────────────────────────────

  static async getRecapMonthly(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const classId = req.query.classId as string | undefined;
      const studentId = req.query.studentId as string | undefined;

      // If startDate/endDate provided, use date range; otherwise fallback to month/year
      if (startDate && endDate) {
        const recap = await AttendanceService.getRecapByDateRange(startDate, endDate, classId, studentId);
        return res.json(recap);
      }
      const recap = await AttendanceService.getRecapMonthly(month, year, classId, studentId);
      return res.json(recap);
    } catch (error: any) {
      console.error("[ATTENDANCE] Recap monthly error:", error);
      return res.status(500).json({ error: "Gagal mengambil rekap" });
    }
  }

  // ─── Student History ────────────────────────────────────────────────────

  static async getStudentHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 60;
      const history = await AttendanceService.getStudentHistory(id, limit);
      return res.json(history);
    } catch (error: any) {
      console.error("[ATTENDANCE] Student history error:", error);
      return res.status(500).json({ error: "Gagal mengambil riwayat siswa" });
    }
  }

  // ─── Edit Record ────────────────────────────────────────────────────────

  static async updateRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await AttendanceService.updateRecord(id, req.body);
      if (!updated) return res.status(404).json({ error: "Record tidak ditemukan atau status tidak valid" });
      return res.json(updated);
    } catch (error: any) {
      console.error("[ATTENDANCE] Update error:", error);
      return res.status(500).json({ error: "Gagal mengupdate record" });
    }
  }

  // ─── Delete Record ──────────────────────────────────────────────────────

  static async deleteRecord(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await AttendanceService.deleteRecord(id);
      if (!deleted) return res.status(404).json({ error: "Record tidak ditemukan" });
      return res.json({ message: "Record dihapus", data: deleted });
    } catch (error: any) {
      console.error("[ATTENDANCE] Delete error:", error);
      return res.status(500).json({ error: "Gagal menghapus record" });
    }
  }

  // ─── Settings ───────────────────────────────────────────────────────────

  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await AttendanceService.getActiveSettings();
      return res.json(settings);
    } catch (error: any) {
      console.error("[ATTENDANCE] Settings error:", error);
      return res.status(500).json({ error: "Gagal mengambil pengaturan" });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const { checkInTime, lateTime, checkOutTime, academicYearId } = req.body;
      if (!checkInTime || !lateTime || !checkOutTime) {
        return res.status(400).json({ error: "Semua waktu wajib diisi" });
      }
      const settings = await AttendanceService.upsertSettings({
        checkInTime, lateTime, checkOutTime, academicYearId,
      });
      return res.json(settings);
    } catch (error: any) {
      console.error("[ATTENDANCE] Update settings error:", error);
      return res.status(500).json({ error: "Gagal mengupdate pengaturan" });
    }
  }
}
