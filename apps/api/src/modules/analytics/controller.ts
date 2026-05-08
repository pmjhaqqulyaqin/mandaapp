import { Request, Response } from "express";
import { AnalyticsService } from "./service";

export class AnalyticsController {
  static async getSummary(req: Request, res: Response) {
    try {
      const summary = await AnalyticsService.getSummary();
      return res.json(summary);
    } catch (error: any) {
      console.error("[ANALYTICS] Summary error:", error);
      return res.status(500).json({ error: "Gagal mengambil summary" });
    }
  }

  static async getClassroomMonitor(req: Request, res: Response) {
    try {
      const data = await AnalyticsService.getClassroomMonitor();
      return res.json(data);
    } catch (error: any) {
      console.error("[ANALYTICS] Classroom monitor error:", error);
      return res.status(500).json({ error: "Gagal mengambil data monitoring kelas" });
    }
  }

  static async getRecentActivity(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 15;
      const activities = await AnalyticsService.getRecentActivity(limit);
      return res.json(activities);
    } catch (error: any) {
      console.error("[ANALYTICS] Recent activity error:", error);
      return res.status(500).json({ error: "Gagal mengambil aktivitas" });
    }
  }

  static async getUpcomingEvents(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const events = await AnalyticsService.getUpcomingEvents(limit);
      return res.json(events);
    } catch (error: any) {
      console.error("[ANALYTICS] Events error:", error);
      return res.status(500).json({ error: "Gagal mengambil jadwal" });
    }
  }

  static async getIKMSummary(req: Request, res: Response) {
    try {
      const ikm = await AnalyticsService.getIKMSummary();
      return res.json(ikm);
    } catch (error: any) {
      console.error("[ANALYTICS] IKM error:", error);
      return res.status(500).json({ error: "Gagal mengambil data IKM" });
    }
  }
}
