import { Request, Response } from "express";
import { db } from "../../db";
import { eq, like, and, asc, sql } from "drizzle-orm";
import { 
  studentProfiles, 
  classes, 
  ijazahSettings, 
  ijazahSubjects, 
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

  static async getSubjects(req: Request, res: Response) {
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
      const { id, name, group, orderNum } = req.body;
      
      if (!name || !group) {
        return res.status(400).json({ error: "Nama mapel dan kelompok wajib diisi" });
      }

      if (id) {
        await db.update(ijazahSubjects)
          .set({ name, group, orderNum: orderNum || 0, updatedAt: new Date() })
          .where(eq(ijazahSubjects.id, id));
      } else {
        await db.insert(ijazahSubjects).values({
          name,
          group,
          orderNum: orderNum || 0
        });
      }

      res.json({ success: true, message: "Mata pelajaran berhasil disimpan" });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to save Ijazah subject");
      res.status(500).json({ error: "Gagal menyimpan mata pelajaran" });
    }
  }

  static async deleteSubject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Soft delete
      await db.update(ijazahSubjects)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(ijazahSubjects.id, id));
        
      res.json({ success: true, message: "Mata pelajaran berhasil dihapus" });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to delete Ijazah subject");
      res.status(500).json({ error: "Gagal menghapus mata pelajaran" });
    }
  }

  static async uploadSubjects(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File Excel tidak ditemukan" });
      }

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        return res.status(400).json({ error: "Worksheet tidak ditemukan di file Excel" });
      }

      const subjects: { name: string; group: string; orderNum: number }[] = [];
      
      worksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return; // Skip header

        const orderNum = row.getCell(1).value;
        const group = String(row.getCell(2).value || '').trim();
        const name = String(row.getCell(3).value || '').trim();

        if (name && group) {
          subjects.push({
            name,
            group,
            orderNum: typeof orderNum === 'number' ? orderNum : rowNumber - 1,
          });
        }
      });

      if (subjects.length === 0) {
        return res.status(400).json({ error: "Tidak ada data mapel yang valid di file. Pastikan kolom Urut, Kelompok, dan Nama Mapel terisi." });
      }

      // Batch insert
      let inserted = 0;
      for (const subj of subjects) {
        await db.insert(ijazahSubjects).values(subj);
        inserted++;
      }

      res.json({ success: true, message: `${inserted} mata pelajaran berhasil diimpor` });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to upload Ijazah subjects");
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

      // Fetch Grade XII classes to build dynamic peminatan groups
      const grade12Classes = await db
        .select({ name: classes.name })
        .from(classes)
        .where(like(classes.name, 'XII %'));

      const peminatanNames = grade12Classes
        .map(c => c.name.replace(/^XII\s*/i, '').replace(/[-\s]*\d+$/, '').trim())
        .filter((v, i, a) => v && a.indexOf(v) === i); // unique

      // Build example rows: fixed wajib + dynamic peminatan + extras
      const examples: { orderNum: number; group: string; name: string }[] = [];
      let order = 1;

      // Kelompok A (Wajib) - always present
      const wajibA = ['Pendidikan Agama Islam', 'PKn', 'Bahasa Indonesia', 'Bahasa Arab', 'Matematika'];
      wajibA.forEach(name => examples.push({ orderNum: order++, group: 'Kelompok A (Wajib)', name }));

      // Kelompok B (Wajib)
      const wajibB = ['Seni Budaya', 'Penjas'];
      wajibB.forEach(name => examples.push({ orderNum: order++, group: 'Kelompok B (Wajib)', name }));

      // Dynamic peminatan based on actual rombel names
      if (peminatanNames.length > 0) {
        for (const peminatan of peminatanNames) {
          examples.push({ orderNum: order++, group: `${peminatan} (Peminatan)`, name: `Contoh Mapel ${peminatan} 1` });
          examples.push({ orderNum: order++, group: `${peminatan} (Peminatan)`, name: `Contoh Mapel ${peminatan} 2` });
        }
      } else {
        // Fallback if no classes found
        examples.push({ orderNum: order++, group: 'Peminatan', name: 'Contoh Mapel Peminatan 1' });
        examples.push({ orderNum: order++, group: 'Peminatan', name: 'Contoh Mapel Peminatan 2' });
      }

      // Lintas Minat & Muatan Lokal
      examples.push({ orderNum: order++, group: 'Lintas Minat', name: 'Contoh Mapel Lintas Minat' });
      examples.push({ orderNum: order++, group: 'Muatan Lokal', name: 'Contoh Muatan Lokal' });

      examples.forEach(ex => worksheet.addRow(ex));

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
      });

      // Style example rows (light bg to indicate they are examples)
      for (let i = 2; i <= examples.length + 1; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell: any) => {
          cell.font = { italic: true, color: { argb: 'FF9CA3AF' } };
          cell.border = { top:{style:'thin', color:{argb:'FFE5E7EB'}}, left:{style:'thin', color:{argb:'FFE5E7EB'}}, bottom:{style:'thin', color:{argb:'FFE5E7EB'}}, right:{style:'thin', color:{argb:'FFE5E7EB'}} };
        });
      }

      // Add instruction note
      const noteRow = worksheet.addRow([]);
      const instrRow = worksheet.addRow(['', 'PETUNJUK:', 'Hapus contoh di atas, lalu isi data mapel Anda. Kolom Kelompok diisi sesuai kategori.']);
      instrRow.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };
      instrRow.getCell(3).font = { italic: true, color: { argb: 'FF6B7280' } };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Template_Mata_Pelajaran_Ijazah.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      logger.error({ err: error }, "Failed to generate subject template");
      res.status(500).json({ error: "Gagal membuat template" });
    }
  }

  // --- FASE 3: UPLOAD NILAI (TEMPLATE & PROCESS) ---

  static async downloadTemplate(req: Request, res: Response) {
    try {
      const { type, classId } = req.query; // type: 'sem12' | 'rombel'
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Nilai');

      // 1. Fetch active subjects
      const subjects = await db
        .select()
        .from(ijazahSubjects)
        .where(eq(ijazahSubjects.isActive, true))
        .orderBy(asc(ijazahSubjects.orderNum));

      // 2. Define Columns
      const columns: any[] = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'NISN', key: 'nisn', width: 15 },
        { header: 'Nama Siswa', key: 'name', width: 35 },
        { header: 'JK', key: 'jk', width: 6 },
      ];

      subjects.forEach((subj) => {
        columns.push({ header: subj.name, key: `subj_${subj.id}`, width: 15 });
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

      // 1. Dapatkan pemetaan kolom (Subject mapping)
      const headers = worksheet.getRow(1).values as string[];
      // values array index dimulai dari 1 di exceljs (index 1 = col A)
      const activeSubjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true));
      
      const subjectMap = new Map<number, string>(); // colIndex -> subject.id
      
      // Template: No(1) | NIS(2) | NISN(3) | Nama(4) | JK(5) | Mapel...(6+)
      for (let i = 6; i < headers.length; i++) {
        const headerName = headers[i];
        if (headerName) {
          const matchedSubject = activeSubjects.find(s => s.name === headerName);
          if (matchedSubject) {
            subjectMap.set(i, matchedSubject.id);
          }
        }
      }

      if (subjectMap.size === 0) {
        return res.status(400).json({ error: "Tidak ditemukan kolom mata pelajaran yang cocok dengan sistem. Pastikan Anda menggunakan template terbaru." });
      }

      // 2. Persiapkan data referensi siswa untuk mencari ID
      const students = await db.select({ id: studentProfiles.id, nisn: studentProfiles.nisn }).from(studentProfiles);
      
      let successCount = 0;
      
      // 3. Looping baris data (Mulai dari baris ke-2)
      for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx++) {
        const row = worksheet.getRow(rowIdx);
        // NISN ada di kolom 3 (C)
        const nisnVal = row.getCell(3).value;
        const nisnStr = nisnVal ? nisnVal.toString().trim() : '';
        
        if (!nisnStr) continue;

        const student = students.find(s => s.nisn === nisnStr);
        if (!student) continue; // Skip jika NISN tidak ada di database

        // Iterasi kolom nilai (mapel)
        for (const [colIdx, subjectId] of subjectMap.entries()) {
          const scoreRaw = row.getCell(colIdx).value;
          // Validasi jika nilai berupa angka atau text yang bisa di-parse
          let score: number | null = null;
          if (typeof scoreRaw === 'number') {
            score = scoreRaw;
          } else if (typeof scoreRaw === 'string') {
            const parsed = parseInt(scoreRaw, 10);
            if (!isNaN(parsed)) score = parsed;
          }

          if (score !== null) {
            // Cek apakah nilai sudah pernah ada di db
            const existingGrades = await db
              .select()
              .from(ijazahGrades)
              .where(and(
                eq(ijazahGrades.studentId, student.id), 
                eq(ijazahGrades.subjectId, subjectId)
              ))
              .limit(1);

            if (existingGrades.length > 0) {
              // Update nilai semester spesifik
              await db.update(ijazahGrades)
                .set({ 
                  [semester]: score, 
                  updatedAt: new Date() 
                })
                .where(eq(ijazahGrades.id, existingGrades[0].id));
            } else {
              // Insert record nilai baru
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
        message: `Upload berhasil. ${successCount} rekor nilai tersimpan.` 
      });

    } catch (error: any) {
      logger.error({ err: error }, "Failed to process Ijazah grades upload");
      res.status(500).json({ error: "Gagal memproses file upload. Pastikan format sesuai template." });
    }
  }

  // --- FASE 3.5: PREVIEW NILAI MENTAH ---

  static async gradesPreview(req: Request, res: Response) {
    try {
      const { type, classId } = req.query; // type: 'global' | 'rombel'

      // 1. Get subjects
      const subjects = await db.select().from(ijazahSubjects)
        .where(eq(ijazahSubjects.isActive, true))
        .orderBy(asc(ijazahSubjects.orderNum));

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
      const { classId } = req.query;
      if (!classId || typeof classId !== 'string') {
        return res.status(400).json({ error: "classId required" });
      }

      // 1. Get Settings
      const settingsResult = await db.select().from(ijazahSettings).limit(1);
      const reportWeight = (settingsResult.length > 0 ? settingsResult[0].reportWeight : 60) ?? 60;
      const examWeight = (settingsResult.length > 0 ? settingsResult[0].examWeight : 40) ?? 40;

      // 2. Get Subjects
      const subjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true)).orderBy(asc(ijazahSubjects.orderNum));

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
        return res.json({ students: [], subjects, reportWeight, examWeight });
      }

      // 4. Get Grades
      const { inArray } = require("drizzle-orm");
      const studentIds = students.map(s => s.id);
      const grades = await db.select().from(ijazahGrades).where(inArray(ijazahGrades.studentId, studentIds));

      // 5. Calculate
      const calculatedStudents = students.map(student => {
        const studentGrades = grades.filter(g => g.studentId === student.id);
        const subjectScores = subjects.map(subj => {
          const g = studentGrades.find(sg => sg.subjectId === subj.id);
          
          let semTotal = 0;
          let semCount = 0;
          // Asumsi perhitungan rata-rata dibagi 5 semester (tetap) meskipun ada yang kosong
          ['semester1', 'semester2', 'semester3', 'semester4', 'semester5'].forEach(sem => {
            const val = g ? (g as any)[sem] : null;
            if (val !== null && val !== undefined) {
              semTotal += val;
              semCount++;
            }
          });
          
          // Pembagi 5 (sesuai standar rapor 5 semester untuk ijazah)
          const avgRaporRaw = semTotal / 5;
          const avgRapor = Math.round(avgRaporRaw * 100) / 100; // 2 desimal
          
          const examScore = g?.examScore || 0;
          
          // Rumus Nilai Ijazah: (RataRapor * BobotRapor) + (Ujian * BobotUjian)
          const finalScoreRaw = (avgRapor * (reportWeight / 100)) + (examScore * (examWeight / 100));
          const finalScore = Math.round(finalScoreRaw); // Biasanya nilai ijazah dibulatkan ke satuan terdekat

          return {
            subjectId: subj.id,
            subjectName: subj.name,
            avgRapor,
            examScore,
            finalScore
          };
        });

        const totalFinal = subjectScores.reduce((acc, curr) => acc + curr.finalScore, 0);
        const avgFinal = subjectScores.length > 0 ? Math.round((totalFinal / subjectScores.length) * 100) / 100 : 0;

        return {
          ...student,
          subjectScores,
          avgFinal
        };
      });

      res.json({ students: calculatedStudents, subjects, reportWeight, examWeight });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Ijazah preview");
      res.status(500).json({ error: "Gagal memuat preview data" });
    }
  }

  static async exportData(req: Request, res: Response) {
    try {
      const { classId, type } = req.query; // type: 'leger' | 'ijazah'
      if (!classId || typeof classId !== 'string') return res.status(400).json({ error: "classId required" });
      
      const isLeger = type === 'leger';

      // Re-use logic from preview
      const settingsResult = await db.select().from(ijazahSettings).limit(1);
      const reportWeight = (settingsResult.length > 0 ? settingsResult[0].reportWeight : 60) ?? 60;
      const examWeight = (settingsResult.length > 0 ? settingsResult[0].examWeight : 40) ?? 40;

      const subjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true)).orderBy(asc(ijazahSubjects.orderNum));
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
        // LEGER: 2 header rows because we have 3 columns per subject (Rata, UM, Ijazah)
        const headerRow1 = ['No', 'NIS', 'NISN', 'Nama Siswa'];
        const headerRow2 = ['', '', '', ''];
        
        subjects.forEach(subj => {
          headerRow1.push(subj.name, '', ''); // Spanning 3 cols
          headerRow2.push('Rata Rapor', 'Nilai UM', 'Nilai Ijazah');
        });
        
        headerRow1.push('Rata-rata Total');
        headerRow2.push('');

        const row1 = worksheet.addRow(headerRow1);
        const row2 = worksheet.addRow(headerRow2);

        // Merge headers for identitas & subjects
        worksheet.mergeCells('A1:A2');
        worksheet.mergeCells('B1:B2');
        worksheet.mergeCells('C1:C2');
        worksheet.mergeCells('D1:D2');

        let colIndex = 5; // E
        subjects.forEach(() => {
          worksheet.mergeCells(1, colIndex, 1, colIndex + 2);
          colIndex += 3;
        });
        worksheet.mergeCells(1, colIndex, 2, colIndex); // Total Rata

        // Styling headers
        [row1, row2].forEach(r => {
          r.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
          r.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          r.eachCell((cell: any) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
          });
        });

      } else {
        // NILAI IJAZAH: 1 header row (Final score only)
        const headerRow = ['No', 'NIS', 'NISN', 'Nama Siswa'];
        subjects.forEach(subj => headerRow.push(subj.name));
        headerRow.push('Rata-rata Total');

        const r1 = worksheet.addRow(headerRow);
        r1.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        r1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        r1.eachCell((cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
          cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        });
      }

      // Populate Data
      students.forEach((student, index) => {
        const studentGrades = grades.filter(g => g.studentId === student.id);
        const rowData: any[] = [index + 1, student.nis, student.nisn, student.fullName];
        
        let totalFinal = 0;

        subjects.forEach(subj => {
          const g = studentGrades.find(sg => sg.subjectId === subj.id);
          let semTotal = 0;
          ['semester1', 'semester2', 'semester3', 'semester4', 'semester5'].forEach(sem => {
            const val = g ? (g as any)[sem] : null;
            if (val !== null && val !== undefined) semTotal += val;
          });
          
          const avgRapor = Math.round((semTotal / 5) * 100) / 100;
          const examScore = g?.examScore || 0;
          const finalScore = Math.round((avgRapor * (reportWeight / 100)) + (examScore * (examWeight / 100)));
          
          totalFinal += finalScore;

          if (isLeger) {
            rowData.push(avgRapor, examScore, finalScore);
          } else {
            rowData.push(finalScore);
          }
        });

        const avgFinal = Math.round((totalFinal / subjects.length) * 100) / 100;
        rowData.push(avgFinal);

        const dataRow = worksheet.addRow(rowData);
        // Border and alignment
        dataRow.eachCell((cell: any, colNumber: number) => {
          cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
          if (colNumber > 4) cell.alignment = { horizontal: 'center' };
        });
      });

      // Set Column Widths
      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 35;
      
      const subjectStartCol = 5;
      const totalCols = isLeger ? 4 + (subjects.length * 3) + 1 : 4 + subjects.length + 1;
      
      for (let i = subjectStartCol; i <= totalCols; i++) {
        worksheet.getColumn(i).width = 12;
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
