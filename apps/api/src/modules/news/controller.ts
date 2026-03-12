import { Request, Response } from "express";
import { NewsService } from "./service";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

export class NewsController {
  static async getAll(req: Request, res: Response) {
    try {
      const news = await NewsService.getAllNews(false);
      res.json(news);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  }

  static async getAllAdmin(req: Request, res: Response) {
    try {
      const news = await NewsService.getAllNews(true);
      res.json(news);
    } catch (error) {
      console.error("Failed to fetch all news:", error);
      res.status(500).json({ error: "Failed to fetch all news" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      let userId: string | undefined;

      // Try to get user session from better-auth first
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (session) {
          userId = session.user.id;
        }
      } catch {
        // Session lookup failed, will try fallback
      }

      // Fallback: read X-User-Id header (for mock auth from frontend)
      if (!userId) {
        userId = req.headers["x-user-id"] as string;
      }

      if (!userId) {
        res.status(401).json({ error: "Unauthorized. Please log in." });
        return;
      }

      const newsData = {
        ...req.body,
        authorId: userId,
      };

      const news = await NewsService.createNews(newsData);
      res.status(201).json(news);
    } catch (error) {
      console.error("Failed to create news:", error);
      res.status(500).json({ error: "Failed to create news", details: String(error) });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const news = await NewsService.updateNews(req.params.id, req.body);
      res.json(news);
    } catch (error) {
      console.error("Failed to update news:", error);
      res.status(500).json({ error: "Failed to update news" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await NewsService.deleteNews(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete news:", error);
      res.status(500).json({ error: "Failed to delete news" });
    }
  }
}

