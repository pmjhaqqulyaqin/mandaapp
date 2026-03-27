import { db } from "../../db";
import { classSchedules } from "../../db/schema";
import { eq } from "drizzle-orm";

export class ScheduleService {
  static async getSchedules(classFilter?: string, teacherFilter?: string) {
    let query = db.select().from(classSchedules);
    // basic filtering, can add where clause depending on options
    // If both filters exist, Drizzle allows chaining `where(and(...))`
    // For simplicity:
    const results = await query;
    return results.filter(s => {
      let keep = true;
      if (classFilter && s.className !== classFilter) keep = false;
      if (teacherFilter && s.teacherId !== teacherFilter) keep = false;
      return keep;
    });
  }

  static async createSchedule(data: any) {
    const results = await db.insert(classSchedules).values(data).returning();
    return results[0];
  }

  static async updateSchedule(id: string, data: any) {
    const results = await db.update(classSchedules).set(data).where(eq(classSchedules.id, id)).returning();
    return results[0];
  }

  static async deleteSchedule(id: string) {
    const results = await db.delete(classSchedules).where(eq(classSchedules.id, id)).returning();
    return results[0];
  }
}
