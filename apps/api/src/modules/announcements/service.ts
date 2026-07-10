import { db } from "../../db";
import { popupAnnouncements } from "../../db/schema";
import { eq, desc, and, lte, gte, or, isNull, sql } from "drizzle-orm";

export class AnnouncementService {
  /**
   * Get all active announcements for public display.
   * Filters: isActive = true AND (now between startDate..endDate or dates are null)
   */
  static async getActive() {
    const now = new Date();
    return db
      .select()
      .from(popupAnnouncements)
      .where(
        and(
          eq(popupAnnouncements.isActive, true),
          or(isNull(popupAnnouncements.startDate), lte(popupAnnouncements.startDate, now)),
          or(isNull(popupAnnouncements.endDate), gte(popupAnnouncements.endDate, now))
        )
      )
      .orderBy(desc(popupAnnouncements.priority), desc(popupAnnouncements.createdAt));
  }

  /** Get all announcements for admin dashboard */
  static async getAll() {
    return db
      .select()
      .from(popupAnnouncements)
      .orderBy(desc(popupAnnouncements.createdAt));
  }

  /** Create a new announcement */
  static async create(data: any) {
    const results = await db.insert(popupAnnouncements).values(data).returning();
    return results[0];
  }

  /** Update an announcement by ID */
  static async update(id: string, data: any) {
    const results = await db
      .update(popupAnnouncements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(popupAnnouncements.id, id))
      .returning();
    return results[0];
  }

  /** Delete an announcement by ID */
  static async delete(id: string) {
    const results = await db
      .delete(popupAnnouncements)
      .where(eq(popupAnnouncements.id, id))
      .returning();
    return results[0];
  }

  /** Toggle isActive for an announcement */
  static async toggleActive(id: string) {
    // Use raw SQL to flip the boolean
    const results = await db
      .update(popupAnnouncements)
      .set({
        isActive: sql`NOT ${popupAnnouncements.isActive}`,
        updatedAt: new Date(),
      } as any)
      .where(eq(popupAnnouncements.id, id))
      .returning();
    return results[0];
  }
}
