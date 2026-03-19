import { db } from "../../db";
import { studentProfiles, identityRevisions } from "../../db/schema";
import { eq } from "drizzle-orm";

export class StudentService {
  static async getAllStudents(classFilter?: string) {
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
}
