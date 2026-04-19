import { Request, Response } from "express";
import { NewsService } from "./service";

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

  /** Lightweight summary for public landing page (no heavy HTML content) */
  static async getSummary(req: Request, res: Response) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);
      const summary = await NewsService.getNewsSummary(limit);
      res.json(summary);
    } catch (error) {
      console.error("Failed to fetch news summary:", error);
      res.status(500).json({ error: "Failed to fetch news summary" });
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
      // req.authUser is guaranteed by requireStaff middleware
      const newsData = {
        ...req.body,
        authorId: req.authUser!.id,
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


