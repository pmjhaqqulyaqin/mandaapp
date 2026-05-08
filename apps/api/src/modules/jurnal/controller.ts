import { Request, Response } from "express";
import { JurnalService } from "./service";
import * as xlsx from "xlsx";
import { db } from "../../db";
import { employees, classes } from "../../db/schema";
import { eq } from "drizzle-orm";

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

  // ─── Excel Import / Template ──────────────────────────────────────────

  static async downloadTemplate(_req: Request, res: Response) {
    try {
      // Fetch employees and classes for reference sheet
      const empList = await db.select({ id: employees.id, name: employees.name }).from(employees);
      const classList = await db.select({ id: classes.id, name: classes.name }).from(classes);

      const wb = xlsx.utils.book_new();

      // Main template sheet
      const templateData = [
        ['Nama Guru', 'Kelas', 'Mata Pelajaran', 'Hari (1=Senin..6=Sabtu)', 'Jam Ke', 'Waktu Mulai', 'Waktu Selesai', 'Semester (ganjil/genap)', 'Tahun Ajaran'],
        ['Contoh: Ahmad S.Pd', 'X IPA 1', 'Matematika', 1, '1-2', '07:30', '09:00', 'ganjil', '2025/2026'],
      ];
      const ws = xlsx.utils.aoa_to_sheet(templateData);
      ws['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 28 }, { wch: 10 },
        { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
      ];
      xlsx.utils.book_append_sheet(wb, ws, 'Jadwal Mengajar');

      // Reference: Employees
      const empData = [['Nama Guru', 'ID'], ...empList.map(e => [e.name, e.id])];
      const wsEmp = xlsx.utils.aoa_to_sheet(empData);
      wsEmp['!cols'] = [{ wch: 30 }, { wch: 40 }];
      xlsx.utils.book_append_sheet(wb, wsEmp, 'Ref Guru');

      // Reference: Classes
      const clsData = [['Nama Kelas', 'ID'], ...classList.map(c => [c.name, c.id])];
      const wsCls = xlsx.utils.aoa_to_sheet(clsData);
      wsCls['!cols'] = [{ wch: 20 }, { wch: 40 }];
      xlsx.utils.book_append_sheet(wb, wsCls, 'Ref Kelas');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=template_jadwal_mengajar.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async importExcel(req: Request, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: 'File Excel diperlukan' });

      const wb = xlsx.read(file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = xlsx.utils.sheet_to_json(ws, { header: 1 });

      // Fetch lookup maps
      const empList = await db.select({ id: employees.id, name: employees.name }).from(employees);
      const classList = await db.select({ id: classes.id, name: classes.name }).from(classes);
      const empMap = new Map(empList.map(e => [e.name?.toLowerCase().trim(), e.id]));
      const classMap = new Map(classList.map(c => [c.name?.toLowerCase().trim(), c.id]));

      const records: any[] = [];
      const errors: string[] = [];

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue; // skip empty rows

        const guruName = String(row[0] || '').trim();
        const kelasName = String(row[1] || '').trim();
        const mapel = String(row[2] || '').trim();
        const hari = Number(row[3]) || 0;
        const jamKe = String(row[4] || '').trim();
        const waktuMulai = String(row[5] || '').trim();
        const waktuSelesai = String(row[6] || '').trim();
        const semester = String(row[7] || 'ganjil').trim().toLowerCase();
        const tahunAjaran = String(row[8] || '').trim();

        // Resolve employee
        let employeeId = empMap.get(guruName.toLowerCase());
        // Try UUID directly if name doesn't match
        if (!employeeId && guruName.match(/^[0-9a-f-]{36}$/i)) employeeId = guruName;
        if (!employeeId) { errors.push(`Baris ${i + 1}: Guru "${guruName}" tidak ditemukan`); continue; }

        // Resolve class
        let classId = classMap.get(kelasName.toLowerCase());
        if (!classId && kelasName.match(/^[0-9a-f-]{36}$/i)) classId = kelasName;
        if (!classId) { errors.push(`Baris ${i + 1}: Kelas "${kelasName}" tidak ditemukan`); continue; }

        if (!mapel) { errors.push(`Baris ${i + 1}: Mata pelajaran kosong`); continue; }
        if (hari < 1 || hari > 6) { errors.push(`Baris ${i + 1}: Hari harus 1-6`); continue; }

        records.push({
          employeeId, classId, subjectName: mapel, dayOfWeek: hari,
          jamKe, waktuMulai: waktuMulai || null, waktuSelesai: waktuSelesai || null,
          semester, tahunAjaran,
        });
      }

      let imported = 0;
      if (records.length > 0) {
        const results = await JurnalService.bulkCreateTeachingSubjects(records);
        imported = results.length;
      }

      res.json({
        success: true,
        imported,
        errors,
        total: rows.length - 1,
        message: `${imported} jadwal berhasil diimpor${errors.length > 0 ? `, ${errors.length} error` : ''}`
      });
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
