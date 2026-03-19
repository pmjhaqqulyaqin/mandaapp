import { Request, Response } from "express";
import { MajorService } from "./service";

export class MajorController {
  static async getAll(req: Request, res: Response) {
    try {
      const allMajors = await MajorService.getAllMajors();
      res.json(allMajors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const major = await MajorService.getMajorById(req.params.id);
      if (!major) {
        return res.status(404).json({ error: "Major not found" });
      }
      res.json(major);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, code } = req.body;
      const major = await MajorService.createMajor({ name, code });
      res.status(201).json(major);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { name, code } = req.body;
      const major = await MajorService.updateMajor(req.params.id, { name, code });
      if (!major) return res.status(404).json({ error: "Major not found" });
      res.json(major);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const major = await MajorService.deleteMajor(req.params.id);
      if (!major) return res.status(404).json({ error: "Major not found" });
      res.json({ message: "Major deleted successfully", major });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
