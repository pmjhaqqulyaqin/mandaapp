import { eq } from "drizzle-orm";
import { db } from "../../db";
import { masterSubjects } from "../../db/schema";

export class SubjectService {
  static async getAll() {
    return db.select().from(masterSubjects).orderBy(masterSubjects.kode);
  }

  static async getActive() {
    return db.select().from(masterSubjects).where(eq(masterSubjects.isActive, true)).orderBy(masterSubjects.kode);
  }

  static async getById(id: string) {
    const result = await db.select().from(masterSubjects).where(eq(masterSubjects.id, id));
    return result[0];
  }

  static async create(data: any) {
    const results = await db.insert(masterSubjects).values(data).returning();
    return results[0];
  }

  static async update(id: string, data: any) {
    const results = await db.update(masterSubjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(masterSubjects.id, id))
      .returning();
    return results[0];
  }

  static async delete(id: string) {
    const results = await db.delete(masterSubjects).where(eq(masterSubjects.id, id)).returning();
    return results[0];
  }
}
