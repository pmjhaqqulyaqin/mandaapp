import { Request, Response } from "express";
import { StudentService } from "./service";

export class StudentController {
  static async getAll(req: Request, res: Response) {
    try {
      const classFilter = req.query.class as string;
      const students = await StudentService.getAllStudents(classFilter);
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const student = await StudentService.getStudentById(req.params.id);
      if (!student) return res.status(404).json({ error: "Not found" });
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const updated = await StudentService.updateStudent(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update student" });
    }
  }

  static async createRevision(req: Request, res: Response) {
    try {
      const revision = await StudentService.createRevisionRequest(req.body);
      res.status(201).json(revision);
    } catch (error) {
      res.status(500).json({ error: "Failed to create revision" });
    }
  }

  static async getRevisions(req: Request, res: Response) {
    try {
      const revisions = await StudentService.getRevisions();
      res.json(revisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revisions" });
    }
  }

  static async updateRevision(req: Request, res: Response) {
    try {
      const updated = await StudentService.updateRevisionStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update revision status" });
    }
  }
}
