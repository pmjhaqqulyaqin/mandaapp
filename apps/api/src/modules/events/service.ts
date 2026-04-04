import { db } from "../../db";
import { schoolEvents } from "../../db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export class EventService {
  static async getByAcademicYear(academicYear: string) {
    return db
      .select()
      .from(schoolEvents)
      .where(eq(schoolEvents.academicYear, academicYear))
      .orderBy(schoolEvents.eventDate);
  }

  static async getByDateRange(startDate: string, endDate: string) {
    return db
      .select()
      .from(schoolEvents)
      .where(
        and(
          gte(schoolEvents.eventDate, startDate),
          lte(schoolEvents.eventDate, endDate)
        )
      )
      .orderBy(schoolEvents.eventDate);
  }

  static async getAll() {
    return db
      .select()
      .from(schoolEvents)
      .orderBy(desc(schoolEvents.eventDate));
  }

  static async getDistinctYears() {
    const results = await db
      .select({ academicYear: schoolEvents.academicYear })
      .from(schoolEvents)
      .groupBy(schoolEvents.academicYear)
      .orderBy(desc(schoolEvents.academicYear));
    return results.map((r) => r.academicYear);
  }

  static async create(data: {
    title: string;
    description?: string;
    eventDate: string;
    endDate?: string;
    category?: string;
    color?: string;
    academicYear: string;
    createdBy?: string;
  }) {
    const results = await db.insert(schoolEvents).values(data).returning();
    return results[0];
  }

  static async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      eventDate: string;
      endDate: string;
      category: string;
      color: string;
      academicYear: string;
    }>
  ) {
    const results = await db
      .update(schoolEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schoolEvents.id, id))
      .returning();
    return results[0];
  }

  static async delete(id: string) {
    const results = await db
      .delete(schoolEvents)
      .where(eq(schoolEvents.id, id))
      .returning();
    return results[0];
  }
}
