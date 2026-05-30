import { db } from "../../db";
import { masterDutyTypes, teacherDuties, employees } from "../../db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// ─── MASTER DUTY TYPES ───

export async function getMasterDutyTypes() {
  return await db.select().from(masterDutyTypes).orderBy(desc(masterDutyTypes.createdAt));
}

export async function createMasterDutyType(data: { name: string; color?: string; icon?: string; isActive?: boolean }) {
  const result = await db.insert(masterDutyTypes).values({
    name: data.name,
    color: data.color || '#14b8a6',
    icon: data.icon || '📋',
    isActive: data.isActive ?? true,
  }).returning();
  return result[0];
}

export async function updateMasterDutyType(id: string, data: Partial<{ name: string; color: string; icon: string; isActive: boolean }>) {
  const result = await db.update(masterDutyTypes).set({
    ...data,
    updatedAt: new Date()
  }).where(eq(masterDutyTypes.id, id)).returning();
  return result[0];
}

export async function deleteMasterDutyType(id: string) {
  await db.delete(masterDutyTypes).where(eq(masterDutyTypes.id, id));
  return { success: true };
}

// ─── TEACHER DUTIES ───

export async function getTeacherDuties(filters?: { startDate?: string; endDate?: string; teacherId?: string; academicYear?: string }) {
  let conditions = [];
  if (filters?.startDate) conditions.push(gte(teacherDuties.dutyDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(teacherDuties.dutyDate, filters.endDate));
  if (filters?.teacherId) conditions.push(eq(teacherDuties.teacherId, filters.teacherId));
  if (filters?.academicYear) conditions.push(eq(teacherDuties.academicYear, filters.academicYear));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db.select({
    id: teacherDuties.id,
    dutyDate: teacherDuties.dutyDate,
    teacherId: teacherDuties.teacherId,
    dutyTypeId: teacherDuties.dutyTypeId,
    notes: teacherDuties.notes,
    academicYear: teacherDuties.academicYear,
    teacherName: employees.name,
    dutyTypeName: masterDutyTypes.name,
    dutyTypeColor: masterDutyTypes.color,
    dutyTypeIcon: masterDutyTypes.icon,
  })
  .from(teacherDuties)
  .leftJoin(employees, eq(teacherDuties.teacherId, employees.id))
  .leftJoin(masterDutyTypes, eq(teacherDuties.dutyTypeId, masterDutyTypes.id))
  .where(whereClause)
  .orderBy(desc(teacherDuties.dutyDate));

  return results;
}

export async function createTeacherDuty(data: { dutyDate: string; teacherId: string; dutyTypeId: string; notes?: string; academicYear?: string }) {
  const result = await db.insert(teacherDuties).values({
    dutyDate: data.dutyDate,
    teacherId: data.teacherId,
    dutyTypeId: data.dutyTypeId,
    notes: data.notes,
    academicYear: data.academicYear,
  }).returning();
  return result[0];
}

export async function updateTeacherDuty(id: string, data: Partial<{ dutyDate: string; teacherId: string; dutyTypeId: string; notes: string; academicYear: string }>) {
  const result = await db.update(teacherDuties).set({
    ...data,
    updatedAt: new Date()
  }).where(eq(teacherDuties.id, id)).returning();
  return result[0];
}

export async function deleteTeacherDuty(id: string) {
  await db.delete(teacherDuties).where(eq(teacherDuties.id, id));
  return { success: true };
}
