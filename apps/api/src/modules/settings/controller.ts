import { Request, Response } from "express";
import { SettingsService } from "./service";
import fs from "fs";
import path from "path";

export class SettingsController {
  /**
   * GET /api/settings/serve-favicon
   * Serves the favicon/logo as an actual image file (not JSON).
   * Google crawler reads this to display the favicon in search results.
   * Priority: favicon_url → logo_url → 404
   */
  static async serveFavicon(req: Request, res: Response) {
    try {
      const allSettings = await SettingsService.getAll();
      const settingsMap: Record<string, string> = {};
      allSettings.forEach((s: any) => {
        if (s.value) settingsMap[s.key] = s.value;
      });

      const dataUri = settingsMap['favicon_url'] || settingsMap['logo_url'];

      if (!dataUri || !dataUri.startsWith('data:')) {
        return res.status(404).send('No favicon configured');
      }

      // Parse data URI: data:image/png;base64,iVBOR...
      const match = dataUri.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(404).send('Invalid favicon data');
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Set headers for browser & crawler caching (24 hours)
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
    } catch (error: any) {
      console.error("Serve favicon error:", error);
      res.status(500).send('Failed to serve favicon');
    }
  }

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

      // Read file and convert to Base64
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString("base64");
      const mimeType = req.file.mimetype;
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      // Save the Base64 data to settings
      await SettingsService.upsert("logo_url", dataUri, "logo");

      // Cleanup: delete the temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete temporary logo file:", err);
      }

      res.json({ url: dataUri });
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

      // Read file and convert to Base64
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString("base64");
      const mimeType = req.file.mimetype;
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      // Save the Base64 data to settings
      await SettingsService.upsert("favicon_url", dataUri, "system");

      // Cleanup: delete the temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete temporary favicon file:", err);
      }

      res.json({ url: dataUri });
    } catch (error: any) {
      console.error("Favicon upload error:", error);
      res.status(500).json({ error: "Failed to upload favicon", details: error?.message || String(error) });
    }
  }
}
