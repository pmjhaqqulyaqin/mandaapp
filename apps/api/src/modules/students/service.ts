import { db } from "../../db";
import { studentProfiles, identityRevisions, parentProfiles, educationHistory, physicalData, bukuIndukGrades, bukuIndukAttendance, bukuIndukExtracurriculars, bukuIndukP5, bukuIndukFinalStatus } from "../../db/schema";
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
      // 1. Update Student Profile
      const studentData = payload.student || {};
      let updatedStudent = null;
      if (Object.keys(studentData).length > 0) {
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

  static async searchStudentsAutocomplete(keyword: string) {
    const trimmed = keyword.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const results = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      nisn: studentProfiles.nisn,
      className: studentProfiles.className,
    }).from(studentProfiles)
      .where(
        or(
          ilike(studentProfiles.fullName, `%${trimmed}%`),
          ilike(studentProfiles.nis, `%${trimmed}%`)
        )
      )
      .limit(10);

    return results;
  }
}
