import { Request, Response } from "express";
import { JurnalService } from "./service";
import * as xlsx from "xlsx";
import { db } from "../../db";
import { employees, classes } from "../../db/schema";

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

  // ─── Teacher Code Management ──────────────────────────────────────────

  static async getTeacherCodes(_req: Request, res: Response) {
    try {
      const result = await db.select({
        id: employees.id, name: employees.name, nip: employees.nip,
        kodeGuru: employees.kodeGuru, type: employees.type,
      }).from(employees).orderBy(employees.name);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateTeacherCodes(req: Request, res: Response) {
    try {
      const { codes } = req.body; // [{employeeId, kodeGuru}]
      if (!Array.isArray(codes)) return res.status(400).json({ error: "codes array required" });

      const { eq } = await import("drizzle-orm");
      let updated = 0;
      for (const item of codes) {
        if (!item.employeeId) continue;
        await db.update(employees)
          .set({ kodeGuru: item.kodeGuru || null, updatedAt: new Date() })
          .where(eq(employees.id, item.employeeId));
        updated++;
      }
      res.json({ success: true, updated });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ─── Excel Import / Template (Grid Format) ─────────────────────────────

  // Default mapel list for MA (editable by admin in the sheet)
  static readonly DEFAULT_MAPEL: [string, string][] = [
    ['A', 'Al-Quran Hadits'], ['B', 'Fikih'], ['C', 'Akidah Akhlak'], ['D', 'SKI'],
    ['E', 'Bahasa Arab'], ['F', 'Pendidikan Pancasila'], ['G', 'Bahasa Indonesia'],
    ['H', 'Bahasa Inggris'], ['I', 'Matematika'], ['J', 'Sejarah'], ['K', 'Penjaskes'],
    ['L', 'Seni Budaya'], ['M', 'Prakarya dan Kewirausahaan'], ['N', 'Ilmu Tafsir'],
    ['O', 'Ilmu Hadits'], ['P', 'Ushul Fikih'], ['Q', 'Ekonomi'], ['R', 'Geografi'],
    ['S', 'Sosiologi'], ['T', 'Fisika'], ['U', 'Kimia'], ['V', 'Biologi'],
    ['W', 'Informatika'], ['X', 'Bimbingan Konseling'], ['Y', 'Tahfidz'], ['Z', 'Mulok'],
  ];

  static readonly DAY_NAMES = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  static readonly MAX_JAM = 12;

  static async downloadTemplate(_req: Request, res: Response) {
    try {
      const empList = await db.select({ id: employees.id, name: employees.name, kodeGuru: employees.kodeGuru }).from(employees).orderBy(employees.name);
      const classList = await db.select({ id: classes.id, name: classes.name }).from(classes);
      const classNames = classList.map(c => c.name).sort();

      const wb = xlsx.utils.book_new();

      // ── Sheet per day (SENIN - SABTU) ──
      for (const dayName of JurnalController.DAY_NAMES) {
        const header = ['JAM', ...classNames];
        const rows: any[][] = [header];
        for (let jam = 1; jam <= JurnalController.MAX_JAM; jam++) {
          rows.push([jam, ...classNames.map(() => '')]);
        }
        const ws = xlsx.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 6 }, ...classNames.map(() => ({ wch: 10 }))];
        xlsx.utils.book_append_sheet(wb, ws, dayName);
      }

      // ── Sheet "Kode Guru" (use stored kodeGuru or fallback to auto-number) ──
      const guruData: any[][] = [['Kode', 'Nama Guru', 'ID (jangan diedit)']];
      empList.forEach((e, i) => {
        guruData.push([e.kodeGuru || String(i + 1), e.name, e.id]);
      });
      const wsGuru = xlsx.utils.aoa_to_sheet(guruData);
      wsGuru['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 40 }];
      xlsx.utils.book_append_sheet(wb, wsGuru, 'Kode Guru');

      // ── Sheet "Kode Mapel" ──
      // Pre-fill with existing distinct subjects from DB + defaults
      let existingSubjects: string[] = [];
      try {
        const existing = await db.selectDistinct({ name: (await import('../../db/schema')).teachingSubjects.subjectName })
          .from((await import('../../db/schema')).teachingSubjects);
        existingSubjects = existing.map(e => e.name).filter(Boolean);
      } catch {}

      const mapelMap = new Map(JurnalController.DEFAULT_MAPEL);
      // Merge existing subjects that aren't in defaults
      let nextCode = 'A'.charCodeAt(0);
      const usedCodes = new Set(mapelMap.keys());
      for (const subj of existingSubjects) {
        const existing = [...mapelMap.entries()].find(([, v]) => v.toLowerCase() === subj.toLowerCase());
        if (!existing) {
          // Find next available letter
          while (usedCodes.has(String.fromCharCode(nextCode)) && nextCode <= 'Z'.charCodeAt(0)) nextCode++;
          if (nextCode <= 'Z'.charCodeAt(0)) {
            const code = String.fromCharCode(nextCode);
            mapelMap.set(code, subj);
            usedCodes.add(code);
            nextCode++;
          }
        }
      }

      const mapelData: any[][] = [['Kode', 'Mata Pelajaran']];
      for (const [code, name] of mapelMap.entries()) {
        mapelData.push([code, name]);
      }
      const wsMapel = xlsx.utils.aoa_to_sheet(mapelData);
      wsMapel['!cols'] = [{ wch: 6 }, { wch: 35 }];
      xlsx.utils.book_append_sheet(wb, wsMapel, 'Kode Mapel');

      // ── Sheet "PETUNJUK" ──
      const helpData = [
        ['PETUNJUK PENGISIAN JADWAL MENGAJAR'],
        [''],
        ['FORMAT CELL: [NomorGuru][HurufMapel]'],
        ['Contoh: 3C = Guru #3 (Azanul Haq) mengajar Mapel C (Akidah Akhlak)'],
        [''],
        ['LANGKAH:'],
        ['1. Lihat sheet "Kode Guru" untuk nomor kode guru'],
        ['2. Lihat sheet "Kode Mapel" untuk huruf kode mata pelajaran'],
        ['3. Isi setiap cell di sheet hari (SENIN-SABTU) dengan format NomorHuruf'],
        ['4. Kosongkan cell jika tidak ada jadwal pada jam tersebut'],
        ['5. Sheet "Kode Mapel" bisa ditambah/diedit sesuai kebutuhan'],
        [''],
        ['CONTOH:'],
        ['  1A = Guru #1 mengajar Al-Quran Hadits'],
        ['  5I = Guru #5 mengajar Matematika'],
        ['  12G = Guru #12 mengajar Bahasa Indonesia'],
      ];
      const wsHelp = xlsx.utils.aoa_to_sheet(helpData);
      wsHelp['!cols'] = [{ wch: 60 }];
      xlsx.utils.book_append_sheet(wb, wsHelp, 'PETUNJUK');

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

      // ── Parse "Kode Guru" sheet ──
      const guruSheet = wb.Sheets['Kode Guru'];
      if (!guruSheet) return res.status(400).json({ error: 'Sheet "Kode Guru" tidak ditemukan' });
      const guruRows: any[] = xlsx.utils.sheet_to_json(guruSheet, { header: 1 });
      const guruMap = new Map<string, string>(); // kode → employeeId
      const guruNameMap = new Map<string, string>(); // kode → name
      for (let i = 1; i < guruRows.length; i++) {
        const row = guruRows[i];
        if (!row || !row[0]) continue;
        const kode = String(row[0]).trim();
        const name = String(row[1] || '').trim();
        const id = String(row[2] || '').trim();
        if (id) {
          guruMap.set(kode, id);
          guruNameMap.set(kode, name);
        }
      }

      // ── Parse "Kode Mapel" sheet ──
      const mapelSheet = wb.Sheets['Kode Mapel'];
      if (!mapelSheet) return res.status(400).json({ error: 'Sheet "Kode Mapel" tidak ditemukan' });
      const mapelRows: any[] = xlsx.utils.sheet_to_json(mapelSheet, { header: 1 });
      const mapelMap = new Map<string, string>(); // letter → subject name
      for (let i = 1; i < mapelRows.length; i++) {
        const row = mapelRows[i];
        if (!row || !row[0]) continue;
        const kode = String(row[0]).trim().toUpperCase();
        const name = String(row[1] || '').trim();
        if (name) mapelMap.set(kode, name);
      }

      // ── Fetch class lookup ──
      const classList = await db.select({ id: classes.id, name: classes.name }).from(classes);
      const classMap = new Map(classList.map(c => [c.name?.trim(), c.id]));

      const records: any[] = [];
      const errors: string[] = [];
      const cellRegex = /^(\d+)([A-Za-z]+)$/;

      // ── Parse day sheets ──
      for (let dayIdx = 0; dayIdx < JurnalController.DAY_NAMES.length; dayIdx++) {
        const dayName = JurnalController.DAY_NAMES[dayIdx];
        const daySheet = wb.Sheets[dayName];
        if (!daySheet) continue;

        const dayRows: any[] = xlsx.utils.sheet_to_json(daySheet, { header: 1 });
        if (dayRows.length < 2) continue;

        const headerRow = dayRows[0];
        // Column 0 = JAM, columns 1+ = class names
        const classColumns: { colIdx: number; classId: string; className: string }[] = [];
        for (let c = 1; c < headerRow.length; c++) {
          const className = String(headerRow[c] || '').trim();
          const cId = classMap.get(className);
          if (cId) {
            classColumns.push({ colIdx: c, classId: cId, className });
          } else if (className) {
            errors.push(`${dayName}: Kelas "${className}" tidak ditemukan di database`);
          }
        }

        // Parse data rows (jam 1-12)
        for (let r = 1; r < dayRows.length; r++) {
          const row = dayRows[r];
          if (!row) continue;
          const jam = Number(row[0]);
          if (!jam || jam < 1 || jam > 12) continue;

          for (const col of classColumns) {
            const cellValue = String(row[col.colIdx] || '').trim();
            if (!cellValue) continue; // empty = no schedule

            const match = cellValue.match(cellRegex);
            if (!match) {
              errors.push(`${dayName} Jam ${jam} ${col.className}: "${cellValue}" format tidak valid (contoh: 3C)`);
              continue;
            }

            const guruKode = match[1];
            const mapelKode = match[2].toUpperCase();

            const employeeId = guruMap.get(guruKode);
            if (!employeeId) {
              errors.push(`${dayName} Jam ${jam} ${col.className}: Kode guru "${guruKode}" tidak ditemukan`);
              continue;
            }

            const subjectName = mapelMap.get(mapelKode);
            if (!subjectName) {
              errors.push(`${dayName} Jam ${jam} ${col.className}: Kode mapel "${mapelKode}" tidak ditemukan`);
              continue;
            }

            records.push({
              employeeId,
              classId: col.classId,
              subjectName,
              dayOfWeek: dayIdx + 1, // 1=Senin, 6=Sabtu
              jamKe: String(jam),
            });
          }
        }
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
        total: records.length + errors.length,
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
