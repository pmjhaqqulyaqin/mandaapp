import { Request, Response } from "express";
import { ParentPortalService } from "./service";

export class ParentPortalController {

  /** Pair parent to child via NISN */
  static async pairChild(req: Request, res: Response) {
    try {
      const userId = req.authUser!.id;
      const { nisn, relation, phone } = req.body;
      if (!nisn) return res.status(400).json({ error: "NISN wajib diisi." });

      const result = await ParentPortalService.pairByNisn(userId, nisn, relation, phone);
      return res.json({ message: "Berhasil terhubung dengan siswa.", ...result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /** Get linked children */
  static async getChildren(req: Request, res: Response) {
    try {
      const children = await ParentPortalService.getLinkedChildren(req.authUser!.id);
      return res.json(children);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil data anak." });
    }
  }

  /** Get student detail */
  static async getStudentDetail(req: Request, res: Response) {
    try {
      const detail = await ParentPortalService.getStudentDetail(req.params.studentId);
      if (!detail) return res.status(404).json({ error: "Siswa tidak ditemukan." });
      return res.json(detail);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil detail siswa." });
    }
  }

  /** Get attendance summary */
  static async getAttendance(req: Request, res: Response) {
    try {
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const data = await ParentPortalService.getAttendanceSummary(req.params.studentId, month, year);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil data kehadiran." });
    }
  }

  /** Get today's jurnal */
  static async getJurnal(req: Request, res: Response) {
    try {
      const jurnals = await ParentPortalService.getJurnalToday(req.params.studentId);
      return res.json(jurnals);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil jurnal." });
    }
  }

  /** Get today's schedule */
  static async getSchedule(req: Request, res: Response) {
    try {
      const schedule = await ParentPortalService.getScheduleToday(req.params.studentId);
      return res.json(schedule);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil jadwal." });
    }
  }

  /** Get weekly trend */
  static async getWeeklyTrend(req: Request, res: Response) {
    try {
      const trend = await ParentPortalService.getWeeklyTrend(req.params.studentId);
      return res.json(trend);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil tren." });
    }
  }

  /** Unlink child */
  static async unlinkChild(req: Request, res: Response) {
    try {
      await ParentPortalService.unlinkChild(req.params.linkId, req.authUser!.id);
      return res.json({ message: "Berhasil memutus koneksi." });
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal memutus koneksi." });
    }
  }

  /** Update notification preferences */
  static async updateNotification(req: Request, res: Response) {
    try {
      const { emailEnabled, waEnabled } = req.body;
      await ParentPortalService.updateNotification(
        req.params.linkId, req.authUser!.id,
        emailEnabled ?? true, waEnabled ?? false
      );
      return res.json({ message: "Preferensi notifikasi diperbarui." });
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal update notifikasi." });
    }
  }

  /** Admin: get parent links for student */
  static async getLinksForStudent(req: Request, res: Response) {
    try {
      const links = await ParentPortalService.getLinksForStudent(req.params.studentId);
      return res.json(links);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil data orang tua." });
    }
  }

  /** Admin: get global notification settings */
  static async getNotifSettings(_req: Request, res: Response) {
    try {
      const settings = await ParentPortalService.getNotifSettings();
      return res.json(settings);
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal mengambil pengaturan notifikasi." });
    }
  }

  /** Admin: update global notification settings */
  static async updateNotifSettings(req: Request, res: Response) {
    try {
      const { emailEnabled, waEnabled } = req.body;
      await ParentPortalService.updateNotifSettings(emailEnabled ?? true, waEnabled ?? false);
      return res.json({ message: "Pengaturan notifikasi diperbarui." });
    } catch (error: any) {
      return res.status(500).json({ error: "Gagal memperbarui pengaturan." });
    }
  }
}
