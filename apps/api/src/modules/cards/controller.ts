import { Request, Response } from "express";
import { CardSettingsService } from "./settingsService";
import { CardPrintHistoryService } from "./service";

// Whitelist of columns that exist in the card_settings table.
// Any other field sent by the frontend will be stripped to prevent Drizzle errors.
const ALLOWED_FIELDS = [
  'schoolName', 'schoolSubtitle', 'schoolLogoUrl', 'academicYear',
  'selectedTemplate', 'orientation', 'showQrCode', 'qrCodeContent',
  'termsText', 'headmasterSignatureUrl', 'kemenagLogoUrl', 'schoolStampUrl',
  'customTemplateHorizontalFrontUrl', 'customTemplateHorizontalBackUrl',
  'customTemplateVerticalFrontUrl', 'customTemplateVerticalBackUrl',
];

function sanitizeCardSettings(data: any): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
}

export class CardSettingsController {
  static async get(req: Request, res: Response) {
    try {
      const settings = await CardSettingsService.getSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch card settings" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const sanitized = sanitizeCardSettings(req.body);
      const current = await CardSettingsService.getSettings();

      if (current?.id) {
        // UPDATE existing row
        const updated = await CardSettingsService.updateSettings(current.id, sanitized);
        res.json(updated);
      } else {
        // INSERT new row — ensure NOT NULL columns have defaults
        const insertData = {
          schoolName: sanitized.schoolName || 'Sekolah',
          schoolSubtitle: sanitized.schoolSubtitle || '-',
          academicYear: sanitized.academicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
          ...sanitized,
        };
        const created = await CardSettingsService.updateSettings('', insertData);
        res.json(created);
      }
    } catch (error: any) {
      console.error("Card settings update error:", error?.message || error, error?.stack);
      res.status(500).json({ error: "Failed to update card settings", details: error?.message });
    }
  }
}

export class CardPrintHistoryController {
  static async getHistory(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await CardPrintHistoryService.getHistory(limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch print history", details: error?.message });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const stats = await CardPrintHistoryService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch print stats", details: error?.message });
    }
  }

  static async logPrint(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { printType, studentCount, classFilter, orientation, templateUsed, studentNames } = req.body;
      
      const record = await CardPrintHistoryService.logPrint({
        printType: printType || 'single',
        studentCount: studentCount || 1,
        classFilter,
        orientation,
        templateUsed,
        studentNames,
        printedBy: userId,
      });
      res.json(record);
    } catch (error: any) {
      console.error("Log print error:", error?.message || error);
      res.status(500).json({ error: "Failed to log print", details: error?.message });
    }
  }
}
