import { db } from "../../db";
import { studentProfiles, identityRevisions } from "../../db/schema";
import { eq, ilike, or } from "drizzle-orm";

export class StudentService {
  static async getAllStudents(classFilter?: string, classIdFilter?: string) {
    if (classIdFilter) {
      return db.select().from(studentProfiles).where(eq(studentProfiles.classId, classIdFilter));
    }
    if (classFilter) {
      return db.select().from(studentProfiles).where(eq(studentProfiles.className, classFilter));
    }
    return db.select().from(studentProfiles);
  }

  static async getStudentById(id: string) {
    const results = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id));
    return results[0] || null;
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
