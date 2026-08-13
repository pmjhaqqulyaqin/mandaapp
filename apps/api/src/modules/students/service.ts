import { db } from "../../db";
import { studentProfiles, identityRevisions, parentProfiles, educationHistory, physicalData, bukuIndukGrades, bukuIndukAttendance, bukuIndukExtracurriculars, bukuIndukP5, bukuIndukFinalStatus, bukuIndukClassMapels } from "../../db/schema";
import { eq, ilike, or, and } from "drizzle-orm";

export class StudentService {
  static async getAllStudents(classFilter?: string, classIdFilter?: string, statusFilter?: string) {
    const conditions = [];
    if (classIdFilter) conditions.push(eq(studentProfiles.classId, classIdFilter));
    if (classFilter) conditions.push(eq(studentProfiles.className, classFilter));
    if (statusFilter) conditions.push(eq(studentProfiles.status, statusFilter));

    if (conditions.length > 0) {
      return db.select().from(studentProfiles).where(and(...conditions));
    }
    return db.select().from(studentProfiles);
  }

  static async getStudentById(id: string) {
    const results = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id));
    return results[0] || null;
  }

  static async getStudentCompleteData(id: string) {
    const student = await this.getStudentById(id);
    if (!student) return null;

    const parents = await db.select().from(parentProfiles).where(eq(parentProfiles.studentId, id));
    const education = await db.select().from(educationHistory).where(eq(educationHistory.studentId, id));
    const physical = await db.select().from(physicalData).where(eq(physicalData.studentId, id));
    const grades = await db.select().from(bukuIndukGrades).where(eq(bukuIndukGrades.studentId, id));
    const attendance = await db.select().from(bukuIndukAttendance).where(eq(bukuIndukAttendance.studentId, id));
    const extracurriculars = await db.select().from(bukuIndukExtracurriculars).where(eq(bukuIndukExtracurriculars.studentId, id));
    const p5 = await db.select().from(bukuIndukP5).where(eq(bukuIndukP5.studentId, id));
    const finalStatus = await db.select().from(bukuIndukFinalStatus).where(eq(bukuIndukFinalStatus.studentId, id));

    return {
      ...student,
      parents,
      education,
      physical,
      grades,
      attendance,
      extracurriculars,
      p5,
      finalStatus
    };
  }

  static async createStudent(data: any) {
    const results = await db.insert(studentProfiles)
      .values(data)
      .onConflictDoUpdate({
        target: studentProfiles.nisn,
        set: data
      })
      .returning();
    return results[0];
  }

  static async bulkCreateStudents(data: any[]) {
    // Gracefully ignore duplicates in bulk
    const results = await db.insert(studentProfiles)
      .values(data)
      .onConflictDoNothing({ target: studentProfiles.nisn })
      .returning();
    return results;
  }

  static async updateStudent(id: string, data: any) {
    const results = await db.update(studentProfiles).set(data).where(eq(studentProfiles.id, id)).returning();
    return results[0];
  }

  static async saveStudentCompleteData(id: string, payload: any) {
    return db.transaction(async (tx) => {
      // 1. Update Student Profile (only known columns)
      const raw = payload.student || {};
      const allowedFields = [
        'fullName', 'nis', 'nisn', 'nik', 'noKk', 'classId', 'className',
        'birthPlace', 'birthDate', 'gender', 'agama', 'kewarganegaraan',
        'anakKe', 'jumlahSaudara', 'bahasaSehariHari', 'golonganDarah',
        'tempatTinggal', 'jarakSekolahKm', 'address', 'photoUrl', 'status',
        'isNotable', 'createdSource'
      ];
      const studentData: any = {};
      for (const key of allowedFields) {
        if (raw[key] !== undefined) {
          // Sanitize empty strings for date/uuid columns
          if ((key === 'birthDate' || key === 'classId') && raw[key] === '') {
            studentData[key] = null;
          } else {
            studentData[key] = raw[key];
          }
        }
      }
      studentData.updatedAt = new Date();

      let updatedStudent = null;
      if (Object.keys(studentData).length > 1) { // > 1 because updatedAt is always present
        const results = await tx.update(studentProfiles).set(studentData).where(eq(studentProfiles.id, id)).returning();
        updatedStudent = results[0];
      }

      // 2. Overwrite Parents
      if (payload.parents && Array.isArray(payload.parents)) {
        await tx.delete(parentProfiles).where(eq(parentProfiles.studentId, id));
        if (payload.parents.length > 0) {
          const parentsToInsert = payload.parents.map((p: any) => ({ ...p, studentId: id }));
          await tx.insert(parentProfiles).values(parentsToInsert);
        }
      }

      // 3. Overwrite Education History
      if (payload.education && Array.isArray(payload.education)) {
        await tx.delete(educationHistory).where(eq(educationHistory.studentId, id));
        if (payload.education.length > 0) {
          const eduToInsert = payload.education.map((e: any) => ({ ...e, studentId: id }));
          await tx.insert(educationHistory).values(eduToInsert);
        }
      }

      // 4. Overwrite Physical Data
      if (payload.physical && Array.isArray(payload.physical)) {
        await tx.delete(physicalData).where(eq(physicalData.studentId, id));
        if (payload.physical.length > 0) {
          const physicalToInsert = payload.physical.map((p: any) => ({ ...p, studentId: id }));
          await tx.insert(physicalData).values(physicalToInsert);
        }
      }

      // 5. Overwrite Buku Induk Grades
      if (payload.grades && Array.isArray(payload.grades)) {
        await tx.delete(bukuIndukGrades).where(eq(bukuIndukGrades.studentId, id));
        if (payload.grades.length > 0) {
          const gradesToInsert = payload.grades.map((g: any) => ({ ...g, studentId: id }));
          await tx.insert(bukuIndukGrades).values(gradesToInsert);
        }
      }

      // 6. Overwrite Buku Induk Attendance
      if (payload.attendance && Array.isArray(payload.attendance)) {
        await tx.delete(bukuIndukAttendance).where(eq(bukuIndukAttendance.studentId, id));
        if (payload.attendance.length > 0) {
          const attToInsert = payload.attendance.map((a: any) => ({ ...a, studentId: id }));
          await tx.insert(bukuIndukAttendance).values(attToInsert);
        }
      }

      // 7. Overwrite Buku Induk Extracurriculars
      if (payload.extracurriculars && Array.isArray(payload.extracurriculars)) {
        await tx.delete(bukuIndukExtracurriculars).where(eq(bukuIndukExtracurriculars.studentId, id));
        if (payload.extracurriculars.length > 0) {
          const extraToInsert = payload.extracurriculars.map((e: any) => ({ ...e, studentId: id }));
          await tx.insert(bukuIndukExtracurriculars).values(extraToInsert);
        }
      }

      // 8. Overwrite Buku Induk P5
      if (payload.p5 && Array.isArray(payload.p5)) {
        await tx.delete(bukuIndukP5).where(eq(bukuIndukP5.studentId, id));
        if (payload.p5.length > 0) {
          const p5ToInsert = payload.p5.map((p: any) => ({ ...p, studentId: id }));
          await tx.insert(bukuIndukP5).values(p5ToInsert);
        }
      }

      // 9. Overwrite Buku Induk Final Status
      if (payload.finalStatus && Array.isArray(payload.finalStatus)) {
        await tx.delete(bukuIndukFinalStatus).where(eq(bukuIndukFinalStatus.studentId, id));
        if (payload.finalStatus.length > 0) {
          const statusToInsert = payload.finalStatus[0]; // Assuming only 1 final status per student
          
          // Check for duplicate ijazah
          if (statusToInsert.statusType === 'Lulus' && statusToInsert.ijazahNumber) {
             const existingIjazah = await tx.select().from(bukuIndukFinalStatus).where(eq(bukuIndukFinalStatus.ijazahNumber, statusToInsert.ijazahNumber));
             if (existingIjazah.length > 0 && existingIjazah[0].studentId !== id) {
                throw new Error(`Nomor Ijazah ${statusToInsert.ijazahNumber} sudah digunakan oleh siswa lain.`);
             }
          }

           const recordToInsert = { ...statusToInsert, studentId: id };
          // Sanitize empty strings to null (prevents unique constraint violation on ijazahNumber)
          for (const key of Object.keys(recordToInsert)) {
            if (typeof recordToInsert[key] === 'string' && recordToInsert[key].trim() === '') {
              recordToInsert[key] = null;
            }
          }
          // Remove any 'id' from previous record to avoid conflict
          delete recordToInsert.id;
          await tx.insert(bukuIndukFinalStatus).values([recordToInsert]);
          
          // Auto update student status
          const newStatusMap: any = {
            'Lulus': 'Lulus',
            'Pindah': 'Pindah',
            'Keluar': 'Keluar'
          };
          const newStatus = newStatusMap[statusToInsert.statusType] || 'Tidak Aktif';
          await tx.update(studentProfiles).set({ status: newStatus }).where(eq(studentProfiles.id, id));
        } else {
          // If deleted, revert to active (optional logic)
          await tx.update(studentProfiles).set({ status: 'active' }).where(eq(studentProfiles.id, id));
        }
      }

      return updatedStudent;
    });
  }

  static async deleteStudent(id: string) {
    // Cascade delete any identity revisions first
    await db.delete(identityRevisions).where(eq(identityRevisions.studentProfileId, id));
    const results = await db.delete(studentProfiles).where(eq(studentProfiles.id, id)).returning();
    return results[0];
  }

  static async createRevisionRequest(data: any) {
    const results = await db.insert(identityRevisions).values(data).returning();
    return results[0];
  }

  static async getRevisions() {
    return db.select().from(identityRevisions);
  }

  static async updateRevisionStatus(id: string, status: string) {
    const results = await db.update(identityRevisions).set({ status }).where(eq(identityRevisions.id, id)).returning();
    return results[0];
  }

  static async publicSearchStudent(fullName: string, birthPlace: string, birthDate: string) {
    const { ilike, and, sql } = require('drizzle-orm');
    
    // Use wildcards for forgiving string matching and SQL DATE() for robust date comparison
    const results = await db.select().from(studentProfiles).where(
      and(
        ilike(studentProfiles.fullName, `%${fullName.trim()}%`),
        ilike(studentProfiles.birthPlace, `%${birthPlace.trim()}%`),
        sql`DATE(${studentProfiles.birthDate}) = DATE(${birthDate})`
      )
    ).limit(1);
    
    return results[0] || null;
  }

  static async publicSearchByNisn(nisn: string) {
    const results = await db.select().from(studentProfiles).where(
      eq(studentProfiles.nisn, nisn.trim())
    ).limit(1);
    
    return results[0] || null;
  }

  static async searchStudentsAutocomplete(q: string) {
    const results = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      nisn: studentProfiles.nisn,
      className: studentProfiles.className
    })
    .from(studentProfiles)
    .where(
      or(
        ilike(studentProfiles.fullName, `%${q}%`),
        ilike(studentProfiles.nisn, `%${q}%`)
      )
    )
    .limit(10);
    
    return results;
  }

  static async getPublicAlumni() {
    const results = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      nisn: studentProfiles.nisn,
      className: studentProfiles.className,
      isNotable: studentProfiles.isNotable,
      photoUrl: studentProfiles.photoUrl,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.status, 'Lulus'))
    .orderBy(studentProfiles.fullName);

    return results;
  }

  // --- Class Mapels (Buku Induk) ---
  static async getClassMapels(classId: string) {
    const result = await db.select().from(bukuIndukClassMapels).where(eq(bukuIndukClassMapels.classId, classId));
    if (result.length > 0) return result[0];
    return null;
  }

  static async updateClassMapels(classId: string, mapels: string[]) {
    const existing = await db.select().from(bukuIndukClassMapels).where(eq(bukuIndukClassMapels.classId, classId));
    if (existing.length > 0) {
      const updated = await db.update(bukuIndukClassMapels)
        .set({ mapels, updatedAt: new Date() })
        .where(eq(bukuIndukClassMapels.classId, classId))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(bukuIndukClassMapels)
        .values({ classId, mapels })
        .returning();
      return inserted[0];
    }
  }

  static async copyClassMapels(sourceClassId: string, targetClassId: string) {
    const source = await this.getClassMapels(sourceClassId);
    if (!source || !source.mapels) throw new Error("Kelas sumber tidak memiliki mapel.");
    
    return await this.updateClassMapels(targetClassId, source.mapels as string[]);
  }

  // ─── Self-Service Methods (Public, no auth) ──────────────────────────────────

  /**
   * Search students by name for self-service update.
   * Returns id, fullName, nisn, nis, className, status.
   */
  static async selfUpdateSearchByName(name: string) {
    const results = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nisn: studentProfiles.nisn,
      nis: studentProfiles.nis,
      className: studentProfiles.className,
      status: studentProfiles.status,
      photoUrl: studentProfiles.photoUrl,
    })
    .from(studentProfiles)
    .where(ilike(studentProfiles.fullName, `%${name}%`))
    .orderBy(studentProfiles.fullName)
    .limit(20);
    return results;
  }

  /**
   * Get complete student data for self-update form (profile + parents + education + physical).
   * Excludes sensitive fields like classId reference; returns denormalized data.
   */
  static async selfUpdateGetCompleteData(id: string) {
    const student = await this.getStudentById(id);
    if (!student) return null;
    const parents = await db.select().from(parentProfiles).where(eq(parentProfiles.studentId, id));
    const education = await db.select().from(educationHistory).where(eq(educationHistory.studentId, id));
    const physical = await db.select().from(physicalData).where(eq(physicalData.studentId, id));
    return { ...student, parents, education, physical };
  }

  /**
   * Save student self-update data. Only whitelisted fields are allowed.
   * NISN, NIS, classId, status are protected and cannot be changed.
   */
  static async selfUpdateSaveData(id: string, payload: {
    student?: any;
    parents?: any[];
    education?: any[];
    physical?: any[];
  }) {
    return db.transaction(async (tx) => {
      // 1. Update student profile — whitelist only safe fields
      if (payload.student) {
        const raw = payload.student;
        const ALLOWED_STUDENT_FIELDS = [
          'nik', 'noKk', 'birthPlace', 'birthDate', 'gender', 'agama',
          'kewarganegaraan', 'anakKe', 'jumlahSaudara', 'bahasaSehariHari',
          'golonganDarah', 'tempatTinggal', 'jarakSekolahKm', 'address',
        ];
        const studentData: any = {};
        for (const key of ALLOWED_STUDENT_FIELDS) {
          if (raw[key] !== undefined) {
            studentData[key] = (key === 'birthDate' && raw[key] === '') ? null : raw[key];
          }
        }
        if (Object.keys(studentData).length > 0) {
          studentData.updatedAt = new Date();
          await tx.update(studentProfiles).set(studentData).where(eq(studentProfiles.id, id));
        }
      }

      // 2. Overwrite parents
      if (payload.parents && Array.isArray(payload.parents)) {
        await tx.delete(parentProfiles).where(eq(parentProfiles.studentId, id));
        if (payload.parents.length > 0) {
          const toInsert = payload.parents
            .filter((p: any) => p.name && p.name.trim() !== '')
            .map((p: any) => ({ ...p, studentId: id }));
          if (toInsert.length > 0) await tx.insert(parentProfiles).values(toInsert);
        }
      }

      // 3. Overwrite education history
      if (payload.education && Array.isArray(payload.education)) {
        await tx.delete(educationHistory).where(eq(educationHistory.studentId, id));
        if (payload.education.length > 0) {
          const toInsert = payload.education.map((e: any) => ({
            ...e,
            studentId: id,
            sttbDate: e.sttbDate || null,
            transferAcceptDate: e.transferAcceptDate || null,
          }));
          await tx.insert(educationHistory).values(toInsert);
        }
      }

      // 4. Overwrite physical data
      if (payload.physical && Array.isArray(payload.physical)) {
        await tx.delete(physicalData).where(eq(physicalData.studentId, id));
        const toInsert = payload.physical
          .filter((p: any) => p.semester)
          .map((p: any) => ({ ...p, studentId: id }));
        if (toInsert.length > 0) await tx.insert(physicalData).values(toInsert);
      }
    });
  }
}
