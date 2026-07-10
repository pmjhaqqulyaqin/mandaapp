import { Request, Response } from "express";
import { AnnouncementService } from "./service";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export class AnnouncementController {
  /** Public: Get active announcements */
  static async getActive(_req: Request, res: Response) {
    try {
      const items = await AnnouncementService.getActive();
      res.json(items);
    } catch (error: any) {
      console.error("Announcement getActive error:", error);
      res.status(500).json({ error: "Failed to fetch active announcements" });
    }
  }

  /** Admin: Get all announcements */
  static async getAll(_req: Request, res: Response) {
    try {
      const items = await AnnouncementService.getAll();
      res.json(items);
    } catch (error: any) {
      console.error("Announcement getAll error:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  }

  /** Admin: Create announcement */
  static async create(req: Request, res: Response) {
    try {
      const item = await AnnouncementService.create({
        ...req.body,
        createdBy: req.authUser!.id,
      });
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Announcement create error:", error);
      res.status(500).json({ error: "Failed to create announcement", details: error?.message });
    }
  }

  /** Admin: Update announcement */
  static async update(req: Request, res: Response) {
    try {
      const item = await AnnouncementService.update(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Announcement not found" });
      res.json(item);
    } catch (error: any) {
      console.error("Announcement update error:", error);
      res.status(500).json({ error: "Failed to update announcement", details: error?.message });
    }
  }

  /** Admin: Delete announcement */
  static async delete(req: Request, res: Response) {
    try {
      const item = await AnnouncementService.delete(req.params.id);
      if (!item) return res.status(404).json({ error: "Announcement not found" });
      res.status(204).send();
    } catch (error: any) {
      console.error("Announcement delete error:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  }

  /** Admin: Toggle active status */
  static async toggleActive(req: Request, res: Response) {
    try {
      const item = await AnnouncementService.toggleActive(req.params.id);
      if (!item) return res.status(404).json({ error: "Announcement not found" });
      res.json(item);
    } catch (error: any) {
      console.error("Announcement toggleActive error:", error);
      res.status(500).json({ error: "Failed to toggle announcement" });
    }
  }

  /** Admin: Upload image for announcement poster */
  static async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const originalPath = req.file.path;
      const parsedPath = path.parse(originalPath);
      let finalFilename = req.file.filename;

      // Convert to webp if not already webp/svg
      if (parsedPath.ext.toLowerCase() !== '.webp' && parsedPath.ext.toLowerCase() !== '.svg') {
        const webpFilename = `${parsedPath.name}.webp`;
        const webpPath = path.join(parsedPath.dir, webpFilename);

        await sharp(originalPath)
          .webp({ quality: 85, effort: 4 })
          .toFile(webpPath);

        // Delete original
        fs.unlink(originalPath, (err) => {
          if (err) console.error("Failed to delete original after WebP conversion:", err);
        });
        finalFilename = webpFilename;
      }

      const url = `/uploads/${finalFilename}`;
      res.json({ url });
    } catch (error: any) {
      console.error("Announcement upload error:", error);
      res.status(500).json({ error: "Upload failed", details: error?.message });
    }
  }
}
