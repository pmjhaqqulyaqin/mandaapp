import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { masterSubjects, subjectSlotAvailability } from "../../db/schema";

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

  // ═══ Subject Slot Availability (Waktu Kosong Mapel) ═══════════════════════

  static async getSlotAvailability(subjectId: string) {
    return db.select({
      id: subjectSlotAvailability.id,
      subjectId: subjectSlotAvailability.subjectId,
      dayOfWeek: subjectSlotAvailability.dayOfWeek,
      jamKe: subjectSlotAvailability.jamKe,
      status: subjectSlotAvailability.status,
      reason: subjectSlotAvailability.reason,
    })
      .from(subjectSlotAvailability)
      .where(eq(subjectSlotAvailability.subjectId, subjectId))
      .orderBy(subjectSlotAvailability.dayOfWeek, subjectSlotAvailability.jamKe);
  }

  static async bulkSetSlotAvailability(
    subjectId: string,
    slots: { dayOfWeek: number; jamKe: number; status: string; reason?: string }[]
  ) {
    // Delete existing slots for this subject
    await db.delete(subjectSlotAvailability).where(
      eq(subjectSlotAvailability.subjectId, subjectId)
    );

    // Only insert non-default (non-available) slots
    const nonDefault = slots.filter(s => s.status !== 'available');
    if (nonDefault.length === 0) return { count: 0, message: 'Semua slot tersedia (default)' };

    const values = nonDefault.map(s => ({
      subjectId,
      dayOfWeek: s.dayOfWeek,
      jamKe: s.jamKe,
      status: s.status,
      reason: s.reason || null,
    }));
    await db.insert(subjectSlotAvailability).values(values);
    return { count: nonDefault.length, message: `${nonDefault.length} slot constraint disimpan` };
  }

  static async setAllAvailable(subjectId: string) {
    const result = await db.delete(subjectSlotAvailability).where(
      eq(subjectSlotAvailability.subjectId, subjectId)
    ).returning();
    return { cleared: result.length, message: `${result.length} constraint dihapus` };
  }
}
