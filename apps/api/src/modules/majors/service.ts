import { db } from "../../db";
import { majors } from "../../db/schema";
import { eq } from "drizzle-orm";

export class MajorService {
  static async getAllMajors() {
    return db.select().from(majors);
  }

  static async getMajorById(id: string) {
    const results = await db.select().from(majors).where(eq(majors.id, id));
    return results[0] || null;
  }

  static async createMajor(data: { name: string; code?: string }) {
    if (!data.code && data.name) {
      if (data.name.length <= 2 && !isNaN(Number(data.name))) {
         data.code = `M${data.name}`; // e.g. "1" -> "M1" to avoid unique issues
      } else {
         data.code = data.name.split(' ').map((w: string) => w.charAt(0)).join('').toUpperCase();
         if (data.code.length < 2) data.code += Math.floor(Math.random() * 1000);
      }
    }
    const results = await db.insert(majors).values(data as any).returning();
    return results[0];
  }

  static async updateMajor(id: string, data: Partial<{ name: string; code: string }>) {
    const results = await db.update(majors).set(data).where(eq(majors.id, id)).returning();
    return results[0];
  }

  static async deleteMajor(id: string) {
    const results = await db.delete(majors).where(eq(majors.id, id)).returning();
    return results[0];
  }
}
