import { Request, Response } from "express";
import { CardSettingsService } from "./service";

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
