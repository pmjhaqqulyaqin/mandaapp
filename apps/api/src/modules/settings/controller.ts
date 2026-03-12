import { Request, Response } from "express";
import { SettingsService } from "./service";

export class SettingsController {
  static async getAll(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getAll();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  static async getByGroup(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getByGroup(req.params.group);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  static async bulkUpdate(req: Request, res: Response) {
    try {
      const { settings } = req.body;
      if (!Array.isArray(settings)) {
        return res.status(400).json({ error: "Settings must be an array" });
      }
      const results = await SettingsService.bulkUpsert(settings);
      res.json(results);
    } catch (error: any) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "Failed to update settings", details: error?.message || String(error) });
    }
  }

  static async uploadLogo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const logoUrl = `/uploads/${req.file.filename}`;
      // Save the logo URL to settings
      await SettingsService.upsert("logo_url", logoUrl, "logo");
      res.json({ url: logoUrl });
    } catch (error: any) {
      console.error("Logo upload error:", error);
      res.status(500).json({ error: "Failed to upload logo", details: error?.message || String(error) });
    }
  }

  static async uploadFavicon(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const faviconUrl = `/uploads/${req.file.filename}`;
      // Save the favicon URL to settings
      await SettingsService.upsert("favicon_url", faviconUrl, "system");
      res.json({ url: faviconUrl });
    } catch (error: any) {
      console.error("Favicon upload error:", error);
      res.status(500).json({ error: "Failed to upload favicon", details: error?.message || String(error) });
    }
  }
}
