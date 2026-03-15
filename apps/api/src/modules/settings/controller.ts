import { Request, Response } from "express";
import { SettingsService } from "./service";
import fs from "fs";
import path from "path";

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
