import { Request, Response } from "express";
import { WaService } from "./service";

export class WaController {

  // GET /api/wa/status
  static async getStatus(req: Request, res: Response) {
    try {
      const status = await WaService.getStatus();
      return res.json(status);
    } catch (err: any) {
      console.error("[WA] Status error:", err);
      return res.status(500).json({ error: "Gagal mengambil status WA" });
    }
  }

  // GET /api/wa/settings
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await WaService.getSettings();
      return res.json(settings);
    } catch (err: any) {
      console.error("[WA] Settings error:", err);
      return res.status(500).json({ error: "Gagal mengambil pengaturan WA" });
    }
  }

  // PUT /api/wa/settings
  static async saveSettings(req: Request, res: Response) {
    try {
      const { fonnteToken, waEnabled, notifyStatuses } = req.body;
      const result = await WaService.saveSettings({ fonnteToken, waEnabled, notifyStatuses });
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Save settings error:", err);
      return res.status(500).json({ error: "Gagal menyimpan pengaturan WA" });
    }
  }

  // GET /api/wa/stats
  static async getStats(req: Request, res: Response) {
    try {
      const stats = await WaService.getStatsToday();
      return res.json(stats);
    } catch (err: any) {
      console.error("[WA] Stats error:", err);
      return res.status(500).json({ error: "Gagal mengambil statistik WA" });
    }
  }

  // GET /api/wa/logs?page=1&limit=30&status=failed&date=2026-10-20
  static async getLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const deliveryStatus = req.query.status as string | undefined;
      const date = req.query.date as string | undefined;

      const result = await WaService.getLogs({ page, limit, deliveryStatus, date });
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Logs error:", err);
      return res.status(500).json({ error: "Gagal mengambil log WA" });
    }
  }

  // POST /api/wa/test { phone: "08123456789" }
  static async testSend(req: Request, res: Response) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Nomor HP wajib diisi" });
      }
      const result = await WaService.testSend(phone);
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Test send error:", err);
      return res.status(500).json({ error: "Gagal mengirim test WA" });
    }
  }

  // POST /api/wa/retry/:logId
  static async retryFailed(req: Request, res: Response) {
    try {
      const { logId } = req.params;
      const result = await WaService.retryFailed(logId);
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Retry error:", err);
      return res.status(500).json({ error: "Gagal retry pesan WA" });
    }
  }

  // GET /api/wa/coverage
  static async getCoverage(req: Request, res: Response) {
    try {
      const result = await WaService.getCoverage();
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Coverage error:", err);
      return res.status(500).json({ error: "Gagal mengambil data cakupan" });
    }
  }

  // GET /api/wa/template
  static async getTemplate(req: Request, res: Response) {
    try {
      const result = await WaService.getTemplate();
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Template error:", err);
      return res.status(500).json({ error: "Gagal mengambil template" });
    }
  }

  // PUT /api/wa/template { template: "..." }
  static async saveTemplate(req: Request, res: Response) {
    try {
      const { template } = req.body;
      if (!template || template.trim().length < 10) {
        return res.status(400).json({ error: "Template terlalu pendek" });
      }
      const result = await WaService.saveTemplate(template);
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Save template error:", err);
      return res.status(500).json({ error: "Gagal menyimpan template" });
    }
  }

  // POST /api/wa/template/reset
  static async resetTemplate(req: Request, res: Response) {
    try {
      const result = await WaService.resetTemplate();
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Reset template error:", err);
      return res.status(500).json({ error: "Gagal reset template" });
    }
  }

  // POST /api/wa/template/preview { template: "..." }
  static async previewTemplate(req: Request, res: Response) {
    try {
      const { template } = req.body;
      if (!template) return res.status(400).json({ error: "Template wajib diisi" });
      const result = await WaService.previewTemplate(template);
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Preview error:", err);
      return res.status(500).json({ error: "Gagal preview template" });
    }
  }

  // GET /api/wa/diagnose?studentName=TITIN
  static async diagnose(req: Request, res: Response) {
    try {
      const result = await WaService.diagnose(req.query.studentName as string);
      return res.json(result);
    } catch (err: any) {
      console.error("[WA] Diagnose error:", err);
      return res.status(500).json({ error: "Gagal diagnosa", detail: err.message });
    }
  }
}
