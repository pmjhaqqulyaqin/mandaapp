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
      const updated = await CardSettingsService.updateSettings(current?.id as string, sanitized);
      res.json(updated);
    } catch (error: any) {
      console.error("Card settings update error:", error?.message || error);
      res.status(500).json({ error: "Failed to update card settings" });
    }
  }
}
