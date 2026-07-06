import { db } from "../../db";
import { classes, employees, classSlotAvailability } from "../../db/schema";
import { eq } from "drizzle-orm";

export class ClassService {
  static async getAllClasses() {
    const results = await db
      .select({
        id: classes.id,
        name: classes.name,
        homeroomTeacherId: classes.homeroomTeacherId,
        homeroomTeacherName: employees.name,
        lunchBreakStart: classes.lunchBreakStart,
        lunchBreakEnd: classes.lunchBreakEnd,
        minLessonsPerDay: classes.minLessonsPerDay,
        maxLessonsPerDay: classes.maxLessonsPerDay,
        numTeachingDays: classes.numTeachingDays,
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

  static async createClass(data: { name: string; homeroomTeacherId?: string }) {
    const results = await db.insert(classes).values(data).returning();
    return results[0];
  }

  static async updateClass(id: string, data: any) {
    const results = await db.update(classes).set({ ...data, updatedAt: new Date() }).where(eq(classes.id, id)).returning();
    return results[0];
  }

  static async deleteClass(id: string) {
    const results = await db.delete(classes).where(eq(classes.id, id)).returning();
    return results[0];
  }

  // ═══ Class Slot Availability (Waktu Kosong Kelas) ═════════════════════════

  static async getSlotAvailability(classId: string) {
    return db.select({
      id: classSlotAvailability.id,
      classId: classSlotAvailability.classId,
      dayOfWeek: classSlotAvailability.dayOfWeek,
      jamKe: classSlotAvailability.jamKe,
      status: classSlotAvailability.status,
      reason: classSlotAvailability.reason,
    })
      .from(classSlotAvailability)
      .where(eq(classSlotAvailability.classId, classId))
      .orderBy(classSlotAvailability.dayOfWeek, classSlotAvailability.jamKe);
  }

  static async bulkSetSlotAvailability(
    classId: string,
    slots: { dayOfWeek: number; jamKe: number; status: string; reason?: string }[]
  ) {
    await db.delete(classSlotAvailability).where(
      eq(classSlotAvailability.classId, classId)
    );
    const nonDefault = slots.filter(s => s.status !== 'available');
    if (nonDefault.length === 0) return { count: 0, message: 'Semua slot tersedia (default)' };
    const values = nonDefault.map(s => ({
      classId,
      dayOfWeek: s.dayOfWeek,
      jamKe: s.jamKe,
      status: s.status,
      reason: s.reason || null,
    }));
    await db.insert(classSlotAvailability).values(values);
    return { count: nonDefault.length, message: `${nonDefault.length} slot constraint disimpan` };
  }

  static async setAllAvailable(classId: string) {
    const result = await db.delete(classSlotAvailability).where(
      eq(classSlotAvailability.classId, classId)
    ).returning();
    return { cleared: result.length, message: `${result.length} constraint dihapus` };
  }
}
