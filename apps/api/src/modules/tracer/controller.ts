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
      let studyId = req.params.id;
      
      // If 'public', find the active study or create one
      if (studyId === 'public') {
        const { db } = require('../../db');
        const { tracerStudies } = require('../../db/schema');
        const { eq } = require('drizzle-orm');
        
        const activeStudies = await db.select().from(tracerStudies).where(eq(tracerStudies.status, 'Aktif')).limit(1);
        if (activeStudies.length > 0) {
          studyId = activeStudies[0].id;
        } else {
          // Create a default active study for this year
          const newStudy = await db.insert(tracerStudies).values({
            title: `Tracer Study Lulusan ${new Date().getFullYear()}`,
            targetYear: new Date().getFullYear().toString(),
            status: 'Aktif'
          }).returning();
          studyId = newStudy[0].id;
        }
      }

      // Allow public submission or verified submission depending on auth context
      const payload = { ...req.body, studyId };
      const response = await TracerService.submitResponse(payload);
      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit response" });
    }
  }

  static async uploadBukti(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      // Save to uploads/tracer/
      const uploadDir = path.join(process.cwd(), 'uploads', 'tracer');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const ext = path.extname(req.file.originalname) || '.pdf';
      const filename = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(uploadDir, filename);
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      const fileUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads/tracer/${filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
}
