import { db } from "../../db";
import { classes, employees } from "../../db/schema";
import { eq } from "drizzle-orm";

export class ClassService {
  static async getAllClasses() {
    const results = await db
      .select({
        id: classes.id,
        name: classes.name,
        majorId: classes.majorId,
        homeroomTeacherId: classes.homeroomTeacherId,
        homeroomTeacherName: employees.name,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt
      })
      .from(classes)
      .leftJoin(employees, eq(classes.homeroomTeacherId, employees.id));
    return results;
  }

  static async getClassById(id: string) {
    const results = await db.select().from(classes).where(eq(classes.id, id));
    return results[0] || null;
  }

  static async createClass(data: { name: string; majorId: string; homeroomTeacherId?: string }) {
    const results = await db.insert(classes).values(data).returning();
    return results[0];
  }

  static async updateClass(id: string, data: Partial<{ name: string; majorId: string; homeroomTeacherId: string | null }>) {
    const results = await db.update(classes).set(data).where(eq(classes.id, id)).returning();
    return results[0];
  }

  static async deleteClass(id: string) {
    const results = await db.delete(classes).where(eq(classes.id, id)).returning();
    return results[0];
  }
}
