import { Request, Response } from "express";
import { db } from "../../db";
import { eq, like, and, asc, sql } from "drizzle-orm";
import { 
  studentProfiles, 
  classes, 
  ijazahSettings, 
  ijazahSubjects, 
  ijazahSubjectMappings,
  ijazahGrades,
  academicYears
} from "../../db/schema";
import logger from "../../lib/logger";

export class IjazahController {
  
  // Ambil daftar rombel (Kelas XII)
  static async getGrade12Classes(req: Request, res: Response) {
    try {
      // Asumsi: Rombel Kelas XII diawali dengan "XII"
      const classList = await db
        .select()
        .from(classes)
        .where(like(classes.name, 'XII %'))
        .orderBy(asc(classes.name));
        
      res.json(classList);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Grade 12 classes");
      res.status(500).json({ error: "Gagal mengambil data rombel Kelas XII" });
    }
  }

  // Ambil daftar siswa Kelas XII (Bisa difilter per Rombel atau Global)
  static async getGrade12Students(req: Request, res: Response) {
    try {
      const { classId } = req.query;
      
      // Build dynamic conditions
      const conditions = [like(classes.name, 'XII %')];
      
      // Jika difilter berdasarkan rombel tertentu
      if (classId && typeof classId === 'string' && classId !== 'global') {
        conditions.push(eq(studentProfiles.classId, classId));
      }

      const students = await db
        .select({
          id: studentProfiles.id,
          nis: studentProfiles.nis,
          nisn: studentProfiles.nisn,
          fullName: studentProfiles.fullName,
          gender: studentProfiles.gender,
          classId: studentProfiles.classId,
          className: classes.name
        })
        .from(studentProfiles)
        .leftJoin(classes, eq(studentProfiles.classId, classes.id))
        .where(and(...conditions))
        .orderBy(asc(classes.name), asc(studentProfiles.fullName));

      
      res.json(students);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Grade 12 students");
      res.status(500).json({ error: "Gagal mengambil data siswa Kelas XII" });
    }
  }

  // --- FASE 2: SETTINGS BOBOT ---

  // Helper: get or create the active academic year ID
  private static async getActiveAcademicYearId(): Promise<string | null> {
    const activeYear = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(eq(academicYears.isActive, true))
      .limit(1);
    if (activeYear.length > 0) return activeYear[0].id;
    
    // Fallback: get any academic year (latest)
    const { desc } = require('drizzle-orm');
    const anyYear = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .orderBy(desc(academicYears.createdAt))
      .limit(1);
    return anyYear.length > 0 ? anyYear[0].id : null;
  }

  static async getSettings(_req: Request, res: Response) {
    try {
      // Simply get the first (and usually only) settings row
      const settings = await db
        .select()
        .from(ijazahSettings)
        .limit(1);

      if (settings.length === 0) {
        return res.json({ reportWeight: 60, examWeight: 40 });
      }

      res.json(settings[0]);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Ijazah settings");
      res.status(500).json({ error: "Gagal mengambil pengaturan bobot" });
    }
  }

  static async saveSettings(req: Request, res: Response) {
    try {
      const { reportWeight, examWeight } = req.body;
      
      if (typeof reportWeight !== 'number' || typeof examWeight !== 'number') {
        return res.status(400).json({ error: "Data pengaturan tidak valid" });
      }

      // Check existing settings (any row)
      const existing = await db
        .select()
        .from(ijazahSettings)
        .limit(1);

      if (existing.length > 0) {
        await db.update(ijazahSettings)
          .set({ reportWeight, examWeight, updatedAt: new Date() })
          .where(eq(ijazahSettings.id, existing[0].id));
      } else {
        // Need a valid academic year ID for FK
        const yearId = await IjazahController.getActiveAcademicYearId();
        if (!yearId) {
          return res.status(400).json({ error: "Tidak ada data tahun ajaran. Silakan buat tahun ajaran terlebih dahulu di Manajemen NIS." });
        }
        await db.insert(ijazahSettings).values({
          academicYearId: yearId,
          reportWeight,
          examWeight
        });
      }

      res.json({ success: true, message: "Pengaturan bobot berhasil disimpan" });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to save Ijazah settings");
      res.status(500).json({ error: "Gagal menyimpan pengaturan bobot" });
    }
  }

  // --- FASE 2: MATA PELAJARAN ---

  static async getSubjects(_req: Request, res: Response) {
    try {
      const subjects = await db
        .select()
        .from(ijazahSubjects)
        .where(eq(ijazahSubjects.isActive, true))
        .orderBy(asc(ijazahSubjects.orderNum));
      res.json(subjects);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Ijazah subjects");
      res.status(500).json({ error: "Gagal mengambil mata pelajaran" });
    }
  }

  static async saveSubject(req: Request, res: Response) {
    try {
      const { id, name, shortName, group, orderNum } = req.body;
      if (!name || !group) return res.status(400).json({ error: "Nama mapel dan kelompok wajib diisi" });
      if (id) {
        await db.update(ijazahSubjects)
          .set({ name, shortName: shortName || null, group, orderNum: orderNum || 0, updatedAt: new Date() })
          .where(eq(ijazahSubjects.id, id));
      } else {
        await db.insert(ijazahSubjects).values({ name, shortName: shortName || null, group, orderNum: orderNum || 0 });
      }
      res.json({ success: true, message: "Mata pelajaran berhasil disimpan" });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal menyimpan mata pelajaran" });
    }
  }

  // Auto-save shortName (singkatan) inline
  static async updateSubjectShortName(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { shortName } = req.body;
      if (!id) return res.status(400).json({ error: "ID wajib diisi" });
      await db.update(ijazahSubjects)
        .set({ shortName: shortName || null, updatedAt: new Date() })
        .where(eq(ijazahSubjects.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal menyimpan singkatan" });
    }
  }

  static async deleteSubject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await db.update(ijazahSubjects).set({ isActive: false, updatedAt: new Date() }).where(eq(ijazahSubjects.id, id));
      res.json({ success: true, message: "Mata pelajaran berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal menghapus mata pelajaran" });
    }
  }

  static async uploadSubjects(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: "File Excel tidak ditemukan" });
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) return res.status(400).json({ error: "Worksheet tidak ditemukan di file Excel" });

      let inserted = 0;
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const orderNum = row.getCell(1).value;
        const group = String(row.getCell(2).value || '').trim();
        const name = String(row.getCell(3).value || '').trim();
        if (!name || !group) continue;
        const ord = typeof orderNum === 'number' ? orderNum : rowNumber - 1;
        await db.insert(ijazahSubjects).values({ name, group, orderNum: ord });
        inserted++;
      }
      res.json({ success: true, message: `${inserted} entri mata pelajaran berhasil diimpor` });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal memproses file Excel" });
    }
  }

  static async downloadSubjectTemplate(_req: Request, res: Response) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Mata Pelajaran');
      worksheet.columns = [
        { header: 'Urut', key: 'orderNum', width: 8 },
        { header: 'Kelompok', key: 'group', width: 30 },
        { header: 'Nama Mata Pelajaran', key: 'name', width: 40 },
      ];
      const examples = [
        { orderNum: 1, group: 'Kelompok A', name: 'Pendidikan Agama Islam' },
        { orderNum: 2, group: 'Kelompok B', name: 'Seni Budaya' },
        { orderNum: 3, group: 'Mapel Pilihan', name: 'Biologi' },
      ];
      examples.forEach(ex => worksheet.addRow(ex));
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Template_Master_Mapel.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ error: "Gagal membuat template" });
    }
  }

  // --- MAPPINGS ---
  static async getMappings(_req: Request, res: Response) {
    try {
      const mappings = await db.select().from(ijazahSubjectMappings);
      res.json(mappings);
    } catch (error) {
      // Table may not exist yet - return empty array gracefully
      res.json([]);
    }
  }

  static async saveMapping(req: Request, res: Response) {
    try {
      const { subjectId, classIds, sem1, sem2, sem3, sem4, sem5, um } = req.body;
      if (!subjectId) return res.status(400).json({ error: "subjectId wajib diisi" });

      const existing = await db.select().from(ijazahSubjectMappings).where(eq(ijazahSubjectMappings.subjectId, subjectId)).limit(1);
      
      const cIds = Array.isArray(classIds) ? classIds : [];
      if (existing.length > 0) {
        await db.update(ijazahSubjectMappings)
          .set({ classIds: cIds, sem1: !!sem1, sem2: !!sem2, sem3: !!sem3, sem4: !!sem4, sem5: !!sem5, um: !!um, updatedAt: new Date() })
          .where(eq(ijazahSubjectMappings.id, existing[0].id));
      } else {
        await db.insert(ijazahSubjectMappings).values({
          subjectId, classIds: cIds, sem1: !!sem1, sem2: !!sem2, sem3: !!sem3, sem4: !!sem4, sem5: !!sem5, um: !!um
        });
      }
      res.json({ success: true, message: "Pemetaan disimpan" });
    } catch (error) {
      res.status(500).json({ error: "Gagal menyimpan pemetaan" });
    }
  }

  // --- INLINE EDIT: Update single grade cell (untuk siswa mutasi) ---

  static async updateSingleGrade(req: Request, res: Response) {
    try {
      const { studentId, subjectId, semester, value } = req.body;

      if (!studentId || !subjectId || !semester) {
        return res.status(400).json({ error: "studentId, subjectId, dan semester wajib diisi" });
      }

      const allowedSemesters = ['semester1', 'semester2', 'semester3', 'semester4', 'semester5', 'examScore'];
      if (!allowedSemesters.includes(semester)) {
        return res.status(400).json({ error: "Semester tidak valid" });
      }

      const score = value === null || value === '' ? null : parseInt(value, 10);
      if (score !== null && isNaN(score)) {
        return res.status(400).json({ error: "Nilai harus berupa angka" });
      }

      // Check existing record
      const existing = await db.select().from(ijazahGrades)
        .where(and(eq(ijazahGrades.studentId, studentId), eq(ijazahGrades.subjectId, subjectId)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(ijazahGrades)
          .set({ [semester]: score, updatedAt: new Date() })
          .where(eq(ijazahGrades.id, existing[0].id));
      } else {
        await db.insert(ijazahGrades).values({
          studentId,
          subjectId,
          [semester]: score,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to update single grade");
      res.status(500).json({ error: "Gagal menyimpan nilai" });
    }
  }

  // --- FASE 3: UPLOAD NILAI (TEMPLATE & PROCESS) ---

  static async downloadTemplate(req: Request, res: Response) {
    try {
      const { type, classId, semester } = req.query; // type: 'sem12' | 'rombel', semester: 'semester1'...'examScore'
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Nilai');

      // Map semester field to subject semester filter
      const semToSubjectSem: Record<string, string> = {
        semester1: 'sem1', semester2: 'sem2', semester3: 'sem3',
        semester4: 'sem4', semester5: 'sem5', examScore: 'um'
      };
      const subjectSemFilter = semester && typeof semester === 'string' ? semToSubjectSem[semester] : null;

      // 1. Fetch active subjects and mappings
      const activeSubjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true)).orderBy(asc(ijazahSubjects.orderNum));
      let mappings: any[] = [];
      try { mappings = await db.select().from(ijazahSubjectMappings); } catch (e) { /* table may not exist yet */ }

      const semKey = semester as string;
      const mappingSemKey = semKey === 'examScore' ? 'um' : semKey === 'semester1' ? 'sem1' : semKey === 'semester2' ? 'sem2' : semKey === 'semester3' ? 'sem3' : semKey === 'semester4' ? 'sem4' : 'sem5';

      const subjects = activeSubjects.filter(subj => {
        const map = mappings.find(m => m.subjectId === subj.id);
        if (!map) {
          // If user hasn't mapped anything yet, show all. If they have, hide unmapped.
          return mappings.length === 0;
        }
        if (!(map as any)[mappingSemKey]) return false; // Semester not active for this subject
        
        const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
        if (isGlobal) return true;
        
        // For global (sem12) mode, show all subjects regardless of classIds
        if (type === 'sem12' || type === 'global') return true;
        
        if (type === 'rombel' && classId && typeof classId === 'string') {
          return (map.classIds as string[]).includes(classId);
        }
        return true;
      });

      // 2. Define Columns
      const columns: any[] = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'NISN', key: 'nisn', width: 15 },
        { header: 'Nama Siswa', key: 'name', width: 35 },
        { header: 'JK', key: 'jk', width: 6 },
      ];

      subjects.forEach((subj) => {
        const headerLabel = subj.shortName || subj.name;
        const colWidth = subj.shortName ? Math.max(6, subj.shortName.length + 2) : 15;
        columns.push({ header: headerLabel, key: `subj_${subj.id}`, width: colWidth });
      });

      worksheet.columns = columns;

      // 3. Fetch Students based on type
      const conditions = [like(classes.name, 'XII %')];
      if (type === 'rombel' && classId && typeof classId === 'string') {
        conditions.push(eq(studentProfiles.classId, classId));
      }

      const students = await db
        .select({
          id: studentProfiles.id,
          nis: studentProfiles.nis,
          nisn: studentProfiles.nisn,
          fullName: studentProfiles.fullName,
          gender: studentProfiles.gender,
        })
        .from(studentProfiles)
        .leftJoin(classes, eq(studentProfiles.classId, classes.id))
        .where(and(...conditions))
        .orderBy(asc(studentProfiles.fullName));

      // 4. Populate rows
      students.forEach((student, index) => {
        worksheet.addRow({
          no: index + 1,
          nis: student.nis,
          nisn: student.nisn,
          name: student.fullName,
          jk: student.gender === 'Laki-laki' ? 'L' : student.gender === 'Perempuan' ? 'P' : student.gender || '-',
        });
      });

      // 5. Styling
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      
      // Color header based on columns
      headerRow.eachCell((cell: any, colNumber: number) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colNumber <= 5 ? 'FF4F46E5' : 'FF10B981' } // Blue for identity, Green for subjects
        };
        cell.border = {
          top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
        };
      });

      // Data borders
      worksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber > 1) {
          row.eachCell((cell: any) => {
            cell.border = {
              top: {style:'thin', color: {argb:'FFE2E8F0'}},
              left: {style:'thin', color: {argb:'FFE2E8F0'}},
              bottom: {style:'thin', color: {argb:'FFE2E8F0'}},
              right: {style:'thin', color: {argb:'FFE2E8F0'}}
            };
          });
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Template_Nilai_${type === 'sem12' ? 'Global' : 'Rombel'}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      logger.error({ err: error }, "Failed to generate Excel template");
      res.status(500).json({ error: "Gagal membuat template Excel" });
    }
  }

  static async uploadGrades(req: Request, res: Response) {
    try {
      const { semester } = req.body; // 'semester1', 'semester2', 'examScore', dll (sesuai field db)
      
      if (!req.file) {
        return res.status(400).json({ error: "File Excel wajib diunggah" });
      }
      
      const allowedSemesters = ['semester1', 'semester2', 'semester3', 'semester4', 'semester5', 'examScore'];
      if (!allowedSemesters.includes(semester)) {
        return res.status(400).json({ error: "Semester/Tipe nilai tidak valid" });
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        return res.status(400).json({ error: "Format Excel tidak valid" });
      }

      // 1. Scan header row to find NISN column and subject columns dynamically
      const headers = worksheet.getRow(1).values as any[];
      const activeSubjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true));
      
      let nisnColIdx = -1;
      const subjectMap = new Map<number, string>(); // colIndex -> subject.id
      
      // Scan all headers: find NISN column and match subject names
      for (let i = 1; i < headers.length; i++) {
        const headerVal = headers[i] ? String(headers[i]).trim() : '';
        if (!headerVal) continue;
        
        // Check if this is the NISN column
        if (headerVal.toUpperCase() === 'NISN') {
          nisnColIdx = i;
          continue;
        }
        
        // Try to match as subject name or shortName (case-insensitive, trimmed)
        const matchedSubject = activeSubjects.find(s => 
          s.name.trim().toLowerCase() === headerVal.toLowerCase() ||
          (s.shortName && s.shortName.trim().toLowerCase() === headerVal.toLowerCase())
        );
        if (matchedSubject) {
          subjectMap.set(i, matchedSubject.id);
        }
      }

      if (nisnColIdx === -1) {
        return res.status(400).json({ error: "Kolom NISN tidak ditemukan di header Excel. Pastikan ada kolom dengan header 'NISN'." });
      }

      if (subjectMap.size === 0) {
        return res.status(400).json({ error: "Tidak ditemukan kolom mata pelajaran yang cocok dengan sistem. Pastikan nama header kolom sesuai dengan nama mapel yang sudah diset." });
      }

      // 2. Persiapkan data referensi siswa untuk mencari ID
      const students = await db.select({ id: studentProfiles.id, nisn: studentProfiles.nisn }).from(studentProfiles);
      
      let successCount = 0;
      let skippedCount = 0;
      
      // 3. Collect students present in Excel and nullify their current semester grades
      // This ensures that removed columns or blank cells correctly clear the grade
      const studentsInExcel = new Set<string>();
      for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx++) {
        const nisnVal = worksheet.getRow(rowIdx).getCell(nisnColIdx).value;
        const nisnStr = nisnVal ? nisnVal.toString().trim() : '';
        if (nisnStr) {
          const student = students.find(s => s.nisn === nisnStr);
          if (student) studentsInExcel.add(student.id);
        }
      }

      if (studentsInExcel.size > 0) {
        const { inArray } = require('drizzle-orm');
        await db.update(ijazahGrades)
          .set({ [semester]: null, updatedAt: new Date() })
          .where(inArray(ijazahGrades.studentId, Array.from(studentsInExcel)));
      }
      
      // 4. Looping baris data (Mulai dari baris ke-2) untuk memasukkan nilai baru
      for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx++) {
        const row = worksheet.getRow(rowIdx);
        const nisnVal = row.getCell(nisnColIdx).value;
        const nisnStr = nisnVal ? nisnVal.toString().trim() : '';
        
        if (!nisnStr) continue;

        const student = students.find(s => s.nisn === nisnStr);
        if (!student) {
          skippedCount++;
          continue;
        }

        // Iterasi kolom nilai (mapel) berdasarkan header match
        for (const [colIdx, subjectId] of subjectMap.entries()) {
          const scoreRaw = row.getCell(colIdx).value;
          let score: number | null = null;
          if (typeof scoreRaw === 'number') {
            score = scoreRaw;
          } else if (typeof scoreRaw === 'string') {
            const parsed = parseInt(scoreRaw, 10);
            if (!isNaN(parsed)) score = parsed;
          }

          if (score !== null) {
            const existingGrades = await db
              .select()
              .from(ijazahGrades)
              .where(and(
                eq(ijazahGrades.studentId, student.id), 
                eq(ijazahGrades.subjectId, subjectId)
              ))
              .limit(1);

            if (existingGrades.length > 0) {
              await db.update(ijazahGrades)
                .set({ 
                  [semester]: score, 
                  updatedAt: new Date() 
                })
                .where(eq(ijazahGrades.id, existingGrades[0].id));
            } else {
              await db.insert(ijazahGrades).values({
                studentId: student.id,
                subjectId: subjectId,
                [semester]: score
              });
            }
            successCount++;
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Upload berhasil. ${successCount} nilai tersimpan.${skippedCount > 0 ? ` ${skippedCount} NISN tidak ditemukan.` : ''}` 
      });

    } catch (error: any) {
      logger.error({ err: error }, "Failed to process Ijazah grades upload");
      res.status(500).json({ error: "Gagal memproses file upload. Pastikan format sesuai template." });
    }
  }

  // --- FASE 3.5: PREVIEW NILAI MENTAH ---

  static async gradesPreview(req: Request, res: Response) {
    try {
      const { type, classId, semester } = req.query; // type: 'global' | 'rombel'

      // 1. Get subjects and filter by mapping
      const activeSubjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true)).orderBy(asc(ijazahSubjects.orderNum));
      let mappings: any[] = [];
      try { mappings = await db.select().from(ijazahSubjectMappings); } catch (e) { /* table may not exist yet */ }
      
      const semKey = semester as string;
      const mappingSemKey = semKey === 'examScore' ? 'um' : semKey === 'semester1' ? 'sem1' : semKey === 'semester2' ? 'sem2' : semKey === 'semester3' ? 'sem3' : semKey === 'semester4' ? 'sem4' : semKey === 'semester5' ? 'sem5' : null;

      const subjects = activeSubjects.filter(subj => {
        const map = mappings.find((m: any) => m.subjectId === subj.id);
        if (!map) return mappings.length === 0; // Hide unmapped if mappings exist
        
        if (mappingSemKey && !(map as any)[mappingSemKey]) return false; // Semester not active
        
        const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
        if (isGlobal) return true;
        
        // For global mode (semester 1/2), show all subjects regardless of classIds
        if (type === 'global') return true;
        
        if (type === 'rombel' && classId && typeof classId === 'string') {
          return (map.classIds as string[]).includes(classId);
        }
        return true;
      });

      // 2. Get students
      const conditions = [like(classes.name, 'XII %')];
      if (type === 'rombel' && classId && typeof classId === 'string') {
        conditions.push(eq(studentProfiles.classId, classId));
      }

      const students = await db.select({
        id: studentProfiles.id,
        nis: studentProfiles.nis,
        nisn: studentProfiles.nisn,
        fullName: studentProfiles.fullName,
        className: classes.name,
      })
      .from(studentProfiles)
      .leftJoin(classes, eq(studentProfiles.classId, classes.id))
      .where(and(...conditions))
      .orderBy(asc(classes.name), asc(studentProfiles.fullName));

      // 3. Get all grades for these students
      const studentIds = students.map(s => s.id);
      let allGrades: any[] = [];
      if (studentIds.length > 0) {
        allGrades = await db.select().from(ijazahGrades)
          .where(
            studentIds.length === 1
              ? eq(ijazahGrades.studentId, studentIds[0])
              : sql`${ijazahGrades.studentId} IN (${sql.join(studentIds.map(id => sql`${id}`), sql`, `)})`
          );
      }

      // 4. Build response
      const result = students.map(student => {
        const grades = allGrades.filter(g => g.studentId === student.id);
        const subjectGrades = subjects.map(subj => {
          const grade = grades.find(g => g.subjectId === subj.id);
          return {
            subjectId: subj.id,
            semester1: grade?.semester1 ?? null,
            semester2: grade?.semester2 ?? null,
            semester3: grade?.semester3 ?? null,
            semester4: grade?.semester4 ?? null,
            semester5: grade?.semester5 ?? null,
            examScore: grade?.examScore ?? null,
          };
        });
        return { ...student, grades: subjectGrades };
      });

      res.json({ students: result, subjects });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to get grades preview");
      res.status(500).json({ error: "Gagal memuat preview nilai" });
    }
  }

  // --- FASE 4: PREVIEW & EXPORT (LEGER & IJAZAH) ---

  static async getPreview(req: Request, res: Response) {
    try {
      const { classId, subjectIds } = req.query; // subjectIds is a comma-separated string of subject names
      if (!classId || typeof classId !== 'string') {
        return res.status(400).json({ error: "classId required" });
      }

      // 1. Get Settings
      const settingsResult = await db.select().from(ijazahSettings).limit(1);
      const reportWeight = (settingsResult.length > 0 ? settingsResult[0].reportWeight : 60) ?? 60;
      const examWeight = (settingsResult.length > 0 ? settingsResult[0].examWeight : 40) ?? 40;

      // 2. Get Selected Subjects from DB (Active subjects that match the selected names)
      let subjectsQuery = db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true));
      let allActiveSubjects = await subjectsQuery;
      
      // Filter by selected subject names if provided
      const selectedNames = typeof subjectIds === 'string' && subjectIds.length > 0 
        ? subjectIds.split(',').map(s => s.trim()) 
        : [];

      // Map mappings to subjects
      let mappings: any[] = [];
      try { mappings = await db.select().from(ijazahSubjectMappings); } catch (e) { /* table may not exist yet */ }
      const subjectMap = new Map<string, any>();
      
      for (const subj of allActiveSubjects) {
        if (selectedNames.length > 0 && !selectedNames.includes(subj.name)) continue;
        const map = mappings.find(m => m.subjectId === subj.id);
        
        if (!map) {
          if (mappings.length > 0) continue; // hide unmapped
        } else {
          const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
          if (!isGlobal && !(map.classIds as string[]).includes(classId)) continue;
        }

        if (!subjectMap.has(subj.name)) {
          // Count active semesters from mapping flags
          let activeSemCount = 5; // default
          if (map) {
            activeSemCount = [map.sem1, map.sem2, map.sem3, map.sem4, map.sem5].filter(Boolean).length;
            if (activeSemCount === 0) activeSemCount = 5; // fallback if none configured
          }
          subjectMap.set(subj.name, {
            name: subj.name,
            group: subj.group,
            orderNum: subj.orderNum,
            hasUm: map?.um || false,
            activeSemCount,
            activeSems: map ? { sem1: !!map.sem1, sem2: !!map.sem2, sem3: !!map.sem3, sem4: !!map.sem4, sem5: !!map.sem5 } : { sem1: true, sem2: true, sem3: true, sem4: true, sem5: true },
            ids: [subj.id]
          });
        }
      }

      const uniqueSubjects = Array.from(subjectMap.values()).sort((a, b) => a.orderNum - b.orderNum);

      // 3. Get Students
      const students = await db.select({
          id: studentProfiles.id,
          nis: studentProfiles.nis,
          nisn: studentProfiles.nisn,
          fullName: studentProfiles.fullName,
        })
        .from(studentProfiles)
        .leftJoin(classes, eq(studentProfiles.classId, classes.id))
        .where(and(like(classes.name, 'XII %'), eq(studentProfiles.classId, classId)))
        .orderBy(asc(studentProfiles.fullName));

      if (students.length === 0) {
        return res.json({ students: [], subjects: uniqueSubjects, reportWeight, examWeight });
      }

      // 4. Get Grades
      const { inArray } = require("drizzle-orm");
      const studentIds = students.map(s => s.id);
      const grades = await db.select().from(ijazahGrades).where(inArray(ijazahGrades.studentId, studentIds));

      // 5. Calculate
      const calculatedStudents = students.map(student => {
        const studentGrades = grades.filter(g => g.studentId === student.id);
        const subjectScores = uniqueSubjects.map((subj: any) => {
          // Get grades for all IDs associated with this subject name
          const gArray = studentGrades.filter(sg => subj.ids.includes(sg.subjectId));
          
          let semTotal = 0;
          let filledSemCount = 0;
          let examScore: number | null = null;
          
          // Extract individual semester values
          const semValues: Record<string, number | null> = {};
          const semKeys = ['semester1', 'semester2', 'semester3', 'semester4', 'semester5'];
          
          semKeys.forEach(sem => {
             let val: number | null = null;
             for(const g of gArray) {
               if((g as any)[sem] !== null && (g as any)[sem] !== undefined) {
                 val = (g as any)[sem];
                 break;
               }
             }
             semValues[sem] = val;
             
             // Extract 'sem1' from 'semester1'
             const mapKey = sem.replace('ester', '');
             if (subj.activeSems[mapKey] && val !== null && val !== undefined) {
               semTotal += val;
               filledSemCount++;
             }
          });
          
          for(const g of gArray) {
             if(g.examScore !== null && g.examScore !== undefined) {
               examScore = g.examScore;
               break;
             }
          }
          
          // Pembagi dinamis: gunakan jumlah semester yang terisi
          const divisor = filledSemCount > 0 ? filledSemCount : 1;
          const avgRaporRaw = semTotal / divisor;
          const avgRapor = Math.round(avgRaporRaw * 100) / 100; // 2 desimal
          
          // Rumus Nilai Ijazah: 
          // Jika ada UM: (RataRapor * BobotRapor) + (Ujian * BobotUjian)
          // Jika TIDAK ada UM: RataRapor murni (rata-rata semester yang terisi)
          let finalScoreRaw = 0;
          if (examScore !== null && examScore !== undefined) {
             finalScoreRaw = (avgRapor * (reportWeight / 100)) + (examScore * (examWeight / 100));
          } else {
             finalScoreRaw = avgRapor;
          }
          
          const finalScore = Math.round(finalScoreRaw);

          return {
            subjectId: subj.ids[0],
            subjectName: subj.name,
            semester1: semValues.semester1,
            semester2: semValues.semester2,
            semester3: semValues.semester3,
            semester4: semValues.semester4,
            semester5: semValues.semester5,
            avgRapor,
            examScore,
            finalScore,
            hasUm: subj.hasUm,
            activeSemCount: divisor
          };
        });

        const totalFinal = subjectScores.reduce((acc: number, curr: any) => acc + curr.finalScore, 0);
        const avgFinal = subjectScores.length > 0 ? Math.round((totalFinal / subjectScores.length) * 100) / 100 : 0;

        return {
          ...student,
          subjectScores,
          avgFinal
        };
      });

      res.json({ students: calculatedStudents, subjects: uniqueSubjects, reportWeight, examWeight });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Ijazah preview");
      res.status(500).json({ error: "Gagal memuat preview data" });
    }
  }

  static async exportData(req: Request, res: Response) {
    try {
      const { classId, type, subjectIds } = req.query; // type: 'leger' | 'ijazah'
      if (!classId || typeof classId !== 'string') return res.status(400).json({ error: "classId required" });
      
      const isLeger = type === 'leger';

      // Re-use logic from preview
      const settingsResult = await db.select().from(ijazahSettings).limit(1);
      const reportWeight = (settingsResult.length > 0 ? settingsResult[0].reportWeight : 60) ?? 60;
      const examWeight = (settingsResult.length > 0 ? settingsResult[0].examWeight : 40) ?? 40;

      // Filter by selected subject names if provided
      const selectedNames = typeof subjectIds === 'string' && subjectIds.length > 0 
        ? subjectIds.split(',').map(s => s.trim()) 
        : [];
      
      let subjectsQuery = db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true));
      let allActiveSubjects = await subjectsQuery;

      let mappings: any[] = [];
      try { mappings = await db.select().from(ijazahSubjectMappings); } catch (e) { /* table may not exist yet */ }

      const subjectMap = new Map<string, any>();
      for (const subj of allActiveSubjects) {
        if (selectedNames.length > 0 && !selectedNames.includes(subj.name)) continue;
        
        const map = mappings.find(m => m.subjectId === subj.id);
        if (!map) {
          if (mappings.length > 0) continue; // hide unmapped
        } else {
          const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
          if (!isGlobal && !(map.classIds as string[]).includes(classId)) continue;
        }

        if (!subjectMap.has(subj.name)) {
          // Count active semesters from mapping
          let activeSemCount = 5;
          if (map) {
            activeSemCount = [map.sem1, map.sem2, map.sem3, map.sem4, map.sem5].filter(Boolean).length;
            if (activeSemCount === 0) activeSemCount = 5;
          }
          subjectMap.set(subj.name, {
            name: subj.name,
            shortName: subj.shortName,
            group: subj.group,
            orderNum: subj.orderNum,
            hasUm: false,
            activeSemCount,
            activeSems: map ? { sem1: !!map.sem1, sem2: !!map.sem2, sem3: !!map.sem3, sem4: !!map.sem4, sem5: !!map.sem5 } : { sem1: true, sem2: true, sem3: true, sem4: true, sem5: true },
            ids: []
          });
        }
        
        const mapEntry = subjectMap.get(subj.name);
        mapEntry.ids.push(subj.id);
        if (map && map.um) {
          mapEntry.hasUm = true;
        }
      }

      const subjects = Array.from(subjectMap.values()).sort((a, b) => a.orderNum - b.orderNum);

      const students = await db.select({
          id: studentProfiles.id,
          nis: studentProfiles.nis,
          nisn: studentProfiles.nisn,
          fullName: studentProfiles.fullName,
          className: classes.name
        })
        .from(studentProfiles)
        .leftJoin(classes, eq(studentProfiles.classId, classes.id))
        .where(and(like(classes.name, 'XII %'), eq(studentProfiles.classId, classId)))
        .orderBy(asc(studentProfiles.fullName));

      if (students.length === 0) return res.status(400).json({ error: "Tidak ada siswa di rombel ini" });

      const { inArray } = require("drizzle-orm");
      const grades = await db.select().from(ijazahGrades).where(inArray(ijazahGrades.studentId, students.map(s=>s.id)));

      // Build Excel
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheetName = isLeger ? 'Leger Ijazah' : 'Nilai Ijazah';
      const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: isLeger ? 2 : 1, xSplit: 4 }] });

      const className = students[0].className || 'Rombel';

      // Build Headers
      if (isLeger) {
        // LEGER: 1 header row with vertical text for subjects
        const headerRow = ['No', 'NIS', 'NISN', 'Nama Siswa', 'Sem/UM'];
        subjects.forEach(subj => headerRow.push(subj.shortName || subj.name));
        headerRow.push('Rata-rata Nilai');

        const row1 = worksheet.addRow(headerRow);
        
        row1.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        row1.height = 120; // make it tall for vertical text
        row1.eachCell((cell: any, colNumber: number) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
          cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
          
          if (colNumber > 5 && colNumber < headerRow.length) {
            cell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true, textRotation: 90 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          }
        });

        // Populate Data (7 rows per student)
        const rowLabels = ['1', '2', '3', '4', '5', 'UM', 'Ijazah'];
        let startRowIndex = 2; // after header

        students.forEach((student, index) => {
          const studentGrades = grades.filter(g => g.studentId === student.id);
          
          const studentDataBySubject = subjects.map(subj => {
             const gArray = studentGrades.filter(sg => subj.ids.includes(sg.subjectId));
             let s1=null, s2=null, s3=null, s4=null, s5=null, um=null;
             
             ['semester1', 'semester2', 'semester3', 'semester4', 'semester5'].forEach((sem, idx) => {
                 let val: number | null = null;
                 for(const g of gArray) {
                   if((g as any)[sem] !== null && (g as any)[sem] !== undefined) {
                     val = (g as any)[sem];
                     break;
                   }
                 }
                 if(idx===0) s1=val;
                 if(idx===1) s2=val;
                 if(idx===2) s3=val;
                 if(idx===3) s4=val;
                 if(idx===4) s5=val;
             });
             
             for(const g of gArray) {
                 if(g.examScore) {
                   um = g.examScore;
                   break;
                 }
             }
             
             let semTotal = 0;
             let filledSemCount = 0;
             if (subj.activeSems.sem1 && s1 !== null && s1 !== undefined) { semTotal += s1; filledSemCount++; }
             if (subj.activeSems.sem2 && s2 !== null && s2 !== undefined) { semTotal += s2; filledSemCount++; }
             if (subj.activeSems.sem3 && s3 !== null && s3 !== undefined) { semTotal += s3; filledSemCount++; }
             if (subj.activeSems.sem4 && s4 !== null && s4 !== undefined) { semTotal += s4; filledSemCount++; }
             if (subj.activeSems.sem5 && s5 !== null && s5 !== undefined) { semTotal += s5; filledSemCount++; }
             
             let divisor = filledSemCount > 0 ? filledSemCount : 1;
             let avgRapor = Math.round((semTotal / divisor) * 100) / 100;
             let finalScoreRaw = (um !== null && um !== undefined) ? (avgRapor * (reportWeight / 100)) + (um * (examWeight / 100)) : avgRapor;
             let ijazah = Math.round(finalScoreRaw);
             
             return { s1, s2, s3, s4, s5, um, ijazah };
          });

          for (let i = 0; i < 7; i++) {
            const label = rowLabels[i];
            const rowData: any[] = [];
            
            rowData.push(index + 1, student.nis, student.nisn, student.fullName, label);

            let rowTotal = 0;
            let validSubjCount = 0;

            studentDataBySubject.forEach(data => {
               let val: any = '';
               if(label === '1') val = data.s1;
               else if(label === '2') val = data.s2;
               else if(label === '3') val = data.s3;
               else if(label === '4') val = data.s4;
               else if(label === '5') val = data.s5;
               else if(label === 'UM') val = data.um;
               else if(label === 'Ijazah') val = data.ijazah;

               rowData.push(val !== null && val !== undefined ? val : '');
               if (typeof val === 'number') {
                 rowTotal += val;
                 validSubjCount++;
               }
            });

            // Rata-rata Nilai for this row
            const avgRow = validSubjCount > 0 ? Math.round((rowTotal / validSubjCount) * 100) / 100 : '';
            rowData.push(avgRow);

            const r = worksheet.addRow(rowData);
            
            // Styling
            r.eachCell((cell: any, colNum: number) => {
              cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
              if (colNum > 4) {
                 cell.alignment = { vertical: 'middle', horizontal: 'center' };
              } else {
                 cell.alignment = { vertical: 'middle', horizontal: 'left' };
              }
              
              if (colNum === 5) {
                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; 
              }
              
              if (label === 'Ijazah') {
                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4CCCC' } }; 
              }
            });
          }

          // Merge student info cells
          worksheet.mergeCells(`A${startRowIndex}:A${startRowIndex + 6}`);
          worksheet.mergeCells(`B${startRowIndex}:B${startRowIndex + 6}`);
          worksheet.mergeCells(`C${startRowIndex}:C${startRowIndex + 6}`);
          worksheet.mergeCells(`D${startRowIndex}:D${startRowIndex + 6}`);
          
          startRowIndex += 7;
        });

      } else {
        // NILAI IJAZAH: 1 header row (Final score only)
        const headerRow = ['No', 'NIS', 'NISN', 'Nama Siswa'];
        subjects.forEach(subj => headerRow.push(subj.shortName || subj.name));
        headerRow.push('Rata-rata Total');

        const r1 = worksheet.addRow(headerRow);
        r1.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        r1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        r1.eachCell((cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
          cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });

        // Populate Data for Nilai Ijazah
        students.forEach((student, index) => {
          const studentGrades = grades.filter(g => g.studentId === student.id);
          const rowData: any[] = [index + 1, student.nis, student.nisn, student.fullName];
          
          let totalFinal = 0;

          subjects.forEach(subj => {
            const gArray = studentGrades.filter(sg => subj.ids.includes(sg.subjectId));
            let semTotal = 0;
            let semCount = 0;
            let examScore: number | null = null;
            
            ['semester1', 'semester2', 'semester3', 'semester4', 'semester5'].forEach(sem => {
               let val: number | null = null;
               for(const g of gArray) {
                 if((g as any)[sem] !== null && (g as any)[sem] !== undefined) {
                   val = (g as any)[sem];
                   break;
                 }
               }
               
               const mapKey = sem.replace('ester', '');
               if (subj.activeSems[mapKey] && val !== null && val !== undefined) {
                 semTotal += val;
                 semCount++;
               }
            });
            
            for(const g of gArray) {
               if(g.examScore !== null && g.examScore !== undefined) {
                 examScore = g.examScore;
                 break;
               }
            }
            
            const divisor = semCount > 0 ? semCount : 1;
            const avgRaporRaw = semTotal / divisor;
            const avgRapor = Math.round(avgRaporRaw * 100) / 100;
            
            let finalScoreRaw = 0;
            if (examScore !== null && examScore !== undefined) {
               finalScoreRaw = (avgRapor * (reportWeight / 100)) + (examScore * (examWeight / 100));
            } else {
               finalScoreRaw = avgRapor;
            }
            const finalScore = Math.round(finalScoreRaw);
            
            totalFinal += finalScore;
            rowData.push(finalScore);
          });

          const avgFinal = subjects.length > 0 ? Math.round((totalFinal / subjects.length) * 100) / 100 : 0;
          rowData.push(avgFinal);

          const dataRow = worksheet.addRow(rowData);
          dataRow.eachCell((cell: any, colNumber: number) => {
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
            if (colNumber > 4) cell.alignment = { horizontal: 'center' };
          });
        });
      }

      // Set Column Widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 35;
      worksheet.getColumn(5).width = 8; // Sem/UM
      
      const subjectStartCol = 6;
      const totalCols = 5 + subjects.length + 1; // Col 6..N for subjects + 1 for avg
      
      for (let i = subjectStartCol; i <= totalCols; i++) {
        worksheet.getColumn(i).width = isLeger ? 6 : 12; // narrow for Leger since vertical text
      }

      const safeClassName = className.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${isLeger ? 'Leger' : 'Nilai'}_Ijazah_${safeClassName}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      logger.error({ err: error }, "Failed to export Ijazah data");
      res.status(500).json({ error: "Gagal mengekspor data" });
    }
  }
}
