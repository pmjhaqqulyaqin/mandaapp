import { Request, Response } from "express";
import { SubjectService } from "./service";

export class SubjectController {
  static async getAll(req: Request, res: Response) {
    try {
      const activeOnly = req.query.active === 'true';
      const data = activeOnly ? await SubjectService.getActive() : await SubjectService.getAll();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch subjects" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const data = await SubjectService.getById(req.params.id);
      if (!data) return res.status(404).json({ error: "Subject not found" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const data = await SubjectService.create(req.body);
      res.status(201).json({ message: "Mata pelajaran berhasil ditambahkan", data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const data = await SubjectService.update(req.params.id, req.body);
      if (!data) return res.status(404).json({ error: "Subject not found" });
      res.json({ message: "Mata pelajaran berhasil diupdate", data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const data = await SubjectService.delete(req.params.id);
      if (!data) return res.status(404).json({ error: "Subject not found" });
      res.json({ message: "Mata pelajaran berhasil dihapus", data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
