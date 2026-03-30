import { Request, Response } from "express";
import { GalleryService } from "./service";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export class GalleryController {
  static async getImages(req: Request, res: Response) {
    try {
      const images = await GalleryService.getImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  }

  static async createImage(req: Request, res: Response) {
    try {
      let userId: string | undefined;
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (session) userId = session.user.id;
      } catch {
        // Session lookup failed
      }
      if (!userId) userId = req.headers["x-user-id"] as string;

      const image = await GalleryService.createImage({
        ...req.body,
        uploadedBy: userId || null,
      });
      res.status(201).json(image);
    } catch (error: any) {
      console.error("Gallery create error:", error);
      res.status(500).json({ error: "Failed to create gallery image", details: error?.message || String(error) });
    }
  }

  static async deleteImage(req: Request, res: Response) {
    try {
      await GalleryService.deleteImage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gallery image" });
    }
  }

  static async updateImage(req: Request, res: Response) {
    try {
      let userId: string | undefined;
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (session) userId = session.user.id;
      } catch {
        // Session lookup failed
      }
      if (!userId) userId = req.headers["x-user-id"] as string;

      const image = await GalleryService.updateImage(req.params.id, req.body);
      res.json(image);
    } catch (error: any) {
      console.error("Gallery update error:", error);
      res.status(500).json({ error: "Failed to update gallery image", details: error?.message || String(error) });
    }
  }

  static async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert to WebP using sharp
      const originalPath = req.file.path;
      const parsedPath = path.parse(originalPath);
      const webpFilename = `${parsedPath.name}.webp`;
      const webpPath = path.join(parsedPath.dir, webpFilename);

      await sharp(originalPath)
        .webp({ quality: 80, effort: 4 })
        .toFile(webpPath);

      // Delete the original uploaded file to save space
      fs.unlink(originalPath, (err) => {
        if (err) console.error("Failed to delete original image after WebP conversion:", err);
      });

      const url = `/uploads/${webpFilename}`;
      res.json({ url });
    } catch (error: any) {
      console.error("Gallery upload error:", error);
      res.status(500).json({ error: "Upload failed", details: error?.message });
    }
  }
}
