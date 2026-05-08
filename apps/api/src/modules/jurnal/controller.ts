import { Request, Response } from "express";
import { JurnalService } from "./service";

export class JurnalController {

  // ─── Teaching Subjects ────────────────────────────────────────────────

  static async getTeachingSubjects(req: Request, res: Response) {
    try {
      const { employeeId, classId, dayOfWeek } = req.query;
      const results = await JurnalService.getTeachingSubjects({
        employeeId: employeeId as string,
        classId: classId as string,
        dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined,
      });
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async getScheduleToday(req: Request, res: Response) {
    try {
      const employeeId = req.query.employeeId as string;
      if (!employeeId) return res.status(400).json({ error: "employeeId required" });
      const results = await JurnalService.getScheduleToday(employeeId);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createTeachingSubject(req: Request, res: Response) {
    try {
      const result = await JurnalService.createTeachingSubject(req.body);
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateTeachingSubject(req: Request, res: Response) {
    try {
      const result = await JurnalService.updateTeachingSubject(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteTeachingSubject(req: Request, res: Response) {
    try {
      const result = await JurnalService.deleteTeachingSubject(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async bulkCreateTeachingSubjects(req: Request, res: Response) {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) return res.status(400).json({ error: "records array required" });
      const results = await JurnalService.bulkCreateTeachingSubjects(records);
      res.status(201).json({ count: results.length, results });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ─── Jurnal Entries ───────────────────────────────────────────────────

  static async getJurnalEntries(req: Request, res: Response) {
    try {
      const { teacherId, classId, date, dateFrom, dateTo, status, limit, offset } = req.query;
      const results = await JurnalService.getJurnalEntries({
        teacherId: teacherId as string, classId: classId as string,
        date: date as string, dateFrom: dateFrom as string, dateTo: dateTo as string,
        status: status as string, limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createJurnalEntry(req: Request, res: Response) {
    try {
      const result = await JurnalService.createJurnalEntry(req.body);
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async getJurnalById(req: Request, res: Response) {
    try {
      const result = await JurnalService.getJurnalById(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateJurnalEntry(req: Request, res: Response) {
    try {
      const result = await JurnalService.updateJurnalEntry(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteJurnalEntry(req: Request, res: Response) {
    try {
      const result = await JurnalService.deleteJurnalEntry(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      if ('error' in result) return res.status(400).json(result);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async submitJurnal(req: Request, res: Response) {
    try {
      const result = await JurnalService.submitJurnal(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async approveJurnal(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const result = await JurnalService.approveJurnal(req.params.id, userId);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async rejectJurnal(req: Request, res: Response) {
    try {
      const { note } = req.body;
      if (!note) return res.status(400).json({ error: "Rejection note required" });
      const result = await JurnalService.rejectJurnal(req.params.id, note);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ─── Student Attendance ───────────────────────────────────────────────

  static async getClassStudents(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const results = await JurnalService.getClassStudentsWithDailyAttendance(classId, date);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async getStudentAttendance(req: Request, res: Response) {
    try {
      const result = await JurnalService.getJurnalById(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result.studentAttendance);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async saveStudentAttendance(req: Request, res: Response) {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) return res.status(400).json({ error: "records array required" });
      const result = await JurnalService.saveStudentAttendance(req.params.id, records);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ─── Attachments ──────────────────────────────────────────────────────

  static async addAttachment(req: Request, res: Response) {
    try {
      const file = (req as any).files?.[0] || (req as any).file;
      if (!file) return res.status(400).json({ error: "File required" });

      const fileUrl = `/uploads/${file.filename}`;
      const result = await JurnalService.addAttachment({
        jurnalEntryId: req.body.jurnalEntryId,
        fileType: req.body.fileType || (file.mimetype.startsWith("video") ? "video" : "photo"),
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
      });
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteAttachment(req: Request, res: Response) {
    try {
      const result = await JurnalService.deleteAttachment(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ─── Monitoring & Recap ───────────────────────────────────────────────

  static async getMonitoring(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      const result = await JurnalService.getMonitoringToday(date);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async getRecap(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo, teacherId, classId } = req.query;
      if (!dateFrom || !dateTo) return res.status(400).json({ error: "dateFrom and dateTo required" });
      const result = await JurnalService.getJurnalRecap({
        dateFrom: dateFrom as string, dateTo: dateTo as string,
        teacherId: teacherId as string, classId: classId as string,
      });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ─── Templates ────────────────────────────────────────────────────────

  static async getTemplates(req: Request, res: Response) {
    try {
      const teacherId = req.query.teacherId as string;
      if (!teacherId) return res.status(400).json({ error: "teacherId required" });
      const results = await JurnalService.getTemplates(teacherId);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createTemplate(req: Request, res: Response) {
    try {
      const result = await JurnalService.createTemplate(req.body);
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async useTemplate(req: Request, res: Response) {
    try {
      const result = await JurnalService.useTemplate(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteTemplate(req: Request, res: Response) {
    try {
      const result = await JurnalService.deleteTemplate(req.params.id);
      if (!result) return res.status(404).json({ error: "Not found" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }
}
