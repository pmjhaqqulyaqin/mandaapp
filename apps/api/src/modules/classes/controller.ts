import { Request, Response } from "express";
import { ClassService } from "./service";

export class ClassController {
  static async getAll(req: Request, res: Response) {
    try {
      const allClasses = await ClassService.getAllClasses();
      res.json(allClasses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const classData = await ClassService.getClassById(req.params.id);
      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }
      res.json(classData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, majorId, homeroomTeacherId } = req.body;
      const classData = await ClassService.createClass({ name, majorId, homeroomTeacherId });
      res.status(201).json(classData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { name, majorId, homeroomTeacherId } = req.body;
      const classData = await ClassService.updateClass(req.params.id, { name, majorId, homeroomTeacherId });
      if (!classData) return res.status(404).json({ error: "Class not found" });
      res.json(classData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const classData = await ClassService.deleteClass(req.params.id);
      if (!classData) return res.status(404).json({ error: "Class not found" });
      res.json({ message: "Class deleted successfully", classData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
