import { Request, Response } from "express";
import { TracerService } from "./service";

export class TracerController {
  static async getAllStudies(req: Request, res: Response) {
    try {
      const studies = await TracerService.getAllStudies();
      res.json(studies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tracer studies" });
    }
  }

  static async getStudyById(req: Request, res: Response) {
    try {
      const study = await TracerService.getStudyById(req.params.id);
      if (!study) return res.status(404).json({ error: "Study not found" });
      res.json(study);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch study" });
    }
  }

  static async createStudy(req: Request, res: Response) {
    try {
      const study = await TracerService.createStudy(req.body);
      res.status(201).json(study);
    } catch (error) {
      res.status(500).json({ error: "Failed to create study" });
    }
  }

  static async updateStudy(req: Request, res: Response) {
    try {
      const study = await TracerService.updateStudy(req.params.id, req.body);
      res.json(study);
    } catch (error) {
      res.status(500).json({ error: "Failed to update study" });
    }
  }

  static async deleteStudy(req: Request, res: Response) {
    try {
      await TracerService.deleteStudy(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete study" });
    }
  }

  static async getResponses(req: Request, res: Response) {
    try {
      const responses = await TracerService.getResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  }

  static async submitResponse(req: Request, res: Response) {
    try {
      // Allow public submission or verified submission depending on auth context
      const payload = { ...req.body, studyId: req.params.id };
      const response = await TracerService.submitResponse(payload);
      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit response" });
    }
  }
}
