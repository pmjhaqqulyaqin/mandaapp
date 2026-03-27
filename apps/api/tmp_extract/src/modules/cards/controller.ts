import { Request, Response } from "express";
import { CardSettingsService } from "./service";

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
      // Assuming a single global setting record, ID might be passed in body or query, or queried first
      const current = await CardSettingsService.getSettings();
      const updated = await CardSettingsService.updateSettings(current?.id as string, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update card settings" });
    }
  }
}
