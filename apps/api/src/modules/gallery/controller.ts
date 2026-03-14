import { Request, Response } from "express";
import { GalleryService } from "./service";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

export class GalleryController {
  static async getAll(req: Request, res: Response) {
    try {
      const images = await GalleryService.getImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  }

  static async create(req: Request, res: Response) {
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

  static async delete(req: Request, res: Response) {
    try {
      await GalleryService.deleteImage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gallery image" });
    }
  }

  static async update(req: Request, res: Response) {
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

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
      }

      const image = await GalleryService.updateImage(req.params.id, req.body);
      res.json(image);
    } catch (error: any) {
      console.error("Gallery update error:", error);
      res.status(500).json({ error: "Failed to update gallery image", details: error?.message || String(error) });
    }
  }
}
