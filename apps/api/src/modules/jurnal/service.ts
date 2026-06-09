import { db } from "../../db";
import {
  teachingSubjects, jurnalEntries, jurnalStudentAttendance,
  jurnalAttachments, jurnalTemplates, employees, classes,
  studentProfiles, attendanceRecords, jurnalTimeSlots, teachingMethods, siteSettings, masterSubjects
} from "../../db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export class JurnalService {

  // ─── Teaching Subjects ────────────────────────────────────────────────

  static async getTeachingSubjects(filters?: { employeeId?: string; classId?: string; dayOfWeek?: number }) {
    const conditions: any[] = [eq(teachingSubjects.isActive, true)];
    if (filters?.employeeId) conditions.push(eq(teachingSubjects.employeeId, filters.employeeId));
    if (filters?.classId) conditions.push(eq(teachingSubjects.classId, filters.classId));
    if (filters?.dayOfWeek) conditions.push(eq(teachingSubjects.dayOfWeek, filters.dayOfWeek));

    return db.select({
      id: teachingSubjects.id,
      employeeId: teachingSubjects.employeeId,
      employeeName: employees.name,
      classId: teachingSubjects.classId,
      className: classes.name,
      subjectId: teachingSubjects.subjectId,
      subjectName: masterSubjects.nama,
      dayOfWeek: teachingSubjects.dayOfWeek,
      jamKe: teachingSubjects.jamKe,
      waktuMulai: teachingSubjects.waktuMulai,
      waktuSelesai: teachingSubjects.waktuSelesai,
      semester: teachingSubjects.semester,
      tahunAjaran: teachingSubjects.tahunAjaran,
    })
      .from(teachingSubjects)
      .leftJoin(employees, eq(teachingSubjects.employeeId, employees.id))
      .leftJoin(classes, eq(teachingSubjects.classId, classes.id))
      .leftJoin(masterSubjects, eq(teachingSubjects.subjectId, masterSubjects.id))
      .where(and(...conditions))
      .orderBy(teachingSubjects.dayOfWeek, teachingSubjects.jamKe);
  }

  static async getScheduleToday(employeeId: string, clientDate?: string) {
    // Use client-provided date to avoid server timezone mismatch
    // clientDate should be "YYYY-MM-DD" from the client's local timezone
    const today = clientDate || new Date().toISOString().split("T")[0];
    // Derive day-of-week from the date string (timezone-safe)
    const [y, m, d] = today.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sunday, 1=Monday...
    if (jsDay === 0) return { schedule: [], deadlineMode: 'waktu_tertentu', deadlineTime: '17:00' };

    const results = await db.select({
      id: teachingSubjects.id,
      classId: teachingSubjects.classId,
      className: classes.name,
      subjectId: teachingSubjects.subjectId,
      subjectName: masterSubjects.nama,
      jamKe: teachingSubjects.jamKe,
      waktuMulai: teachingSubjects.waktuMulai,
      waktuSelesai: teachingSubjects.waktuSelesai,
    })
      .from(teachingSubjects)
      .leftJoin(classes, eq(teachingSubjects.classId, classes.id))
      .leftJoin(masterSubjects, eq(teachingSubjects.subjectId, masterSubjects.id))
      .where(and(
        eq(teachingSubjects.employeeId, employeeId),
        eq(teachingSubjects.dayOfWeek, jsDay),
        eq(teachingSubjects.isActive, true)
      ))
      .orderBy(teachingSubjects.jamKe);

    const todayJurnals = await db.select({ teachingSubjectId: jurnalEntries.teachingSubjectId })
      .from(jurnalEntries)
      .where(and(eq(jurnalEntries.teacherId, employeeId), eq(jurnalEntries.date, today)));
    const filledIds = new Set(todayJurnals.map(j => j.teachingSubjectId));

    // Fetch deadline settings
    const deadlineSettings = await db.select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(sql`${siteSettings.key} IN ('jurnal_deadline_mode', 'jurnal_deadline_time')`);
    
    const settingsMap: Record<string, string> = {};
    for (const s of deadlineSettings) { if (s.key && s.value) settingsMap[s.key] = s.value; }

    const schedule = results.map(r => ({ ...r, alreadyFilled: filledIds.has(r.id) }));

    return {
      schedule,
      deadlineMode: settingsMap['jurnal_deadline_mode'] || 'waktu_tertentu',
      deadlineTime: settingsMap['jurnal_deadline_time'] || '17:00',
    };
  }

  static async createTeachingSubject(data: any) {
    // Sanitize empty strings to null for time columns
    if (data.waktuMulai === '') data.waktuMulai = null;
    if (data.waktuSelesai === '') data.waktuSelesai = null;
    const results = await db.insert(teachingSubjects).values(data).returning();
    return results[0];
  }

  static async updateTeachingSubject(id: string, data: any) {
    // Sanitize empty strings to null for time columns
    if (data.waktuMulai === '') data.waktuMulai = null;
    if (data.waktuSelesai === '') data.waktuSelesai = null;
    const results = await db.update(teachingSubjects).set({ ...data, updatedAt: new Date() }).where(eq(teachingSubjects.id, id)).returning();
    return results[0];
  }

  static async deleteTeachingSubject(id: string) {
    const results = await db.delete(teachingSubjects).where(eq(teachingSubjects.id, id)).returning();
    return results[0];
  }

  static async bulkCreateTeachingSubjects(data: any[]) {
    if (!data.length) return [];
    // Sanitize empty strings to null for time columns
    for (const d of data) {
      if (d.waktuMulai === '') d.waktuMulai = null;
      if (d.waktuSelesai === '') d.waktuSelesai = null;
    }
    return db.insert(teachingSubjects).values(data).returning();
  }

  // ─── Jurnal Entries ───────────────────────────────────────────────────

  static async createJurnalEntry(data: any) {
    const results = await db.insert(jurnalEntries).values(data).returning();
    return results[0];
  }

  static async updateJurnalEntry(id: string, data: any) {
    const results = await db.update(jurnalEntries).set({ ...data, updatedAt: new Date() }).where(eq(jurnalEntries.id, id)).returning();
    return results[0];
  }

  static async deleteJurnalEntry(id: string) {
    const entry = await db.select().from(jurnalEntries).where(eq(jurnalEntries.id, id)).limit(1);
    if (!entry.length) return null;
    if (entry[0].status !== "draft") return { error: "Hanya jurnal draft yang bisa dihapus" };
    return (await db.delete(jurnalEntries).where(eq(jurnalEntries.id, id)).returning())[0];
  }

  static async submitJurnal(id: string) {
    return (await db.update(jurnalEntries).set({ status: "submitted", updatedAt: new Date() }).where(eq(jurnalEntries.id, id)).returning())[0];
  }

  static async approveJurnal(id: string, approvedById: string) {
    return (await db.update(jurnalEntries).set({ status: "approved", approvedBy: approvedById, approvedAt: new Date(), updatedAt: new Date() }).where(eq(jurnalEntries.id, id)).returning())[0];
  }

  static async rejectJurnal(id: string, note: string) {
    return (await db.update(jurnalEntries).set({ status: "rejected", rejectionNote: note, updatedAt: new Date() }).where(eq(jurnalEntries.id, id)).returning())[0];
  }

  static async getJurnalEntries(filters: { teacherId?: string; classId?: string; date?: string; dateFrom?: string; dateTo?: string; status?: string; limit?: number; offset?: number }) {
    const conditions: any[] = [];
    if (filters.teacherId) conditions.push(eq(jurnalEntries.teacherId, filters.teacherId));
    if (filters.classId) conditions.push(eq(jurnalEntries.classId, filters.classId));
    if (filters.date) conditions.push(eq(jurnalEntries.date, filters.date));
    if (filters.dateFrom) conditions.push(sql`${jurnalEntries.date} >= ${filters.dateFrom}`);
    if (filters.dateTo) conditions.push(sql`${jurnalEntries.date} <= ${filters.dateTo}`);
    if (filters.status) conditions.push(eq(jurnalEntries.status, filters.status));

    return db.select({
      id: jurnalEntries.id, teacherId: jurnalEntries.teacherId, teacherName: employees.name,
      classId: jurnalEntries.classId, className: classes.name, 
      subjectId: jurnalEntries.subjectId, subjectName: masterSubjects.nama,
      date: jurnalEntries.date, jamKe: jurnalEntries.jamKe, linkRpp: jurnalEntries.linkRpp,
      materiPembelajaran: jurnalEntries.materiPembelajaran, metode: jurnalEntries.metode,
      catatan: jurnalEntries.catatan, evaluasi: jurnalEntries.evaluasi,
      jumlahHadir: jurnalEntries.jumlahHadir, jumlahIzin: jurnalEntries.jumlahIzin,
      jumlahSakit: jurnalEntries.jumlahSakit, jumlahAlpa: jurnalEntries.jumlahAlpa,
      totalSiswa: jurnalEntries.totalSiswa, status: jurnalEntries.status,
      createdAt: jurnalEntries.createdAt,
    })
      .from(jurnalEntries)
      .leftJoin(employees, eq(jurnalEntries.teacherId, employees.id))
      .leftJoin(classes, eq(jurnalEntries.classId, classes.id))
      .leftJoin(masterSubjects, eq(jurnalEntries.subjectId, masterSubjects.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(jurnalEntries.date), jurnalEntries.jamKe)
      .limit(filters.limit || 50).offset(filters.offset || 0);
  }

  static async getJurnalById(id: string) {
    const entries = await db.select({
      id: jurnalEntries.id, teachingSubjectId: jurnalEntries.teachingSubjectId,
      teacherId: jurnalEntries.teacherId, teacherName: employees.name,
      classId: jurnalEntries.classId, className: classes.name,
      subjectId: jurnalEntries.subjectId, subjectName: masterSubjects.nama, 
      date: jurnalEntries.date,
      jamKe: jurnalEntries.jamKe, waktuMulai: jurnalEntries.waktuMulai, waktuSelesai: jurnalEntries.waktuSelesai,
      linkRpp: jurnalEntries.linkRpp, materiPembelajaran: jurnalEntries.materiPembelajaran,
      metode: jurnalEntries.metode, capaianPembelajaran: jurnalEntries.capaianPembelajaran,
      kendalaDanSolusi: jurnalEntries.kendalaDanSolusi, catatan: jurnalEntries.catatan, evaluasi: jurnalEntries.evaluasi,
      jumlahHadir: jurnalEntries.jumlahHadir, jumlahIzin: jurnalEntries.jumlahIzin,
      jumlahSakit: jurnalEntries.jumlahSakit, jumlahAlpa: jurnalEntries.jumlahAlpa, totalSiswa: jurnalEntries.totalSiswa,
      status: jurnalEntries.status, approvedBy: jurnalEntries.approvedBy, approvedAt: jurnalEntries.approvedAt,
      rejectionNote: jurnalEntries.rejectionNote, createdAt: jurnalEntries.createdAt,
    }).from(jurnalEntries)
      .leftJoin(employees, eq(jurnalEntries.teacherId, employees.id))
      .leftJoin(classes, eq(jurnalEntries.classId, classes.id))
      .leftJoin(masterSubjects, eq(jurnalEntries.subjectId, masterSubjects.id))
      .where(eq(jurnalEntries.id, id)).limit(1);

    if (!entries.length) return null;

    const attachments = await db.select().from(jurnalAttachments).where(eq(jurnalAttachments.jurnalEntryId, id));
    const studentAtt = await db.select({
      id: jurnalStudentAttendance.id, studentId: jurnalStudentAttendance.studentId,
      studentName: studentProfiles.fullName, nis: studentProfiles.nis,
      status: jurnalStudentAttendance.status, note: jurnalStudentAttendance.note,
    }).from(jurnalStudentAttendance)
      .leftJoin(studentProfiles, eq(jurnalStudentAttendance.studentId, studentProfiles.id))
      .where(eq(jurnalStudentAttendance.jurnalEntryId, id)).orderBy(studentProfiles.fullName);

    return { ...entries[0], attachments, studentAttendance: studentAtt };
  }

  // ─── Student Attendance per Mapel ─────────────────────────────────────

  static async getClassStudentsWithDailyAttendance(classId: string, date: string) {
    const students = await db.select({ id: studentProfiles.id, fullName: studentProfiles.fullName, nis: studentProfiles.nis })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.classId, classId), eq(studentProfiles.status, "active")))
      .orderBy(studentProfiles.fullName);

    const daily = await db.select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status, checkIn: attendanceRecords.checkIn })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.classId, classId), eq(attendanceRecords.date, date)));

    const map = new Map(daily.map(a => [a.studentId, a]));
    return students.map(s => ({ ...s, dailyStatus: map.get(s.id)?.status || null, dailyCheckIn: map.get(s.id)?.checkIn || null }));
  }

  static async saveStudentAttendance(jurnalEntryId: string, records: { studentId: string; status: string; note?: string }[]) {
    await db.delete(jurnalStudentAttendance).where(eq(jurnalStudentAttendance.jurnalEntryId, jurnalEntryId));
    if (!records.length) return { count: 0 };

    await db.insert(jurnalStudentAttendance).values(records.map(r => ({ jurnalEntryId, studentId: r.studentId, status: r.status, note: r.note || null })));

    const summary = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    for (const r of records) { if (r.status in summary) summary[r.status as keyof typeof summary]++; }

    await db.update(jurnalEntries).set({
      jumlahHadir: summary.Hadir, jumlahIzin: summary.Izin, jumlahSakit: summary.Sakit, jumlahAlpa: summary.Alpa,
      totalSiswa: records.length, updatedAt: new Date(),
    }).where(eq(jurnalEntries.id, jurnalEntryId));

    return { count: records.length, summary };
  }

  // ─── Attachments ──────────────────────────────────────────────────────

  static async addAttachment(data: { jurnalEntryId: string; fileType: string; fileUrl: string; fileName?: string; fileSize?: number }) {
    return (await db.insert(jurnalAttachments).values(data).returning())[0];
  }

  static async deleteAttachment(id: string) {
    return (await db.delete(jurnalAttachments).where(eq(jurnalAttachments.id, id)).returning())[0];
  }

  // ─── Monitoring ───────────────────────────────────────────────────────

  static async getMonitoringToday(date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    // Parse date components to avoid timezone issues with new Date(string)
    const [y, m, d] = targetDate.split("-").map(Number);
    const jsDay = new Date(y, m - 1, d).getDay();
    if (jsDay === 0) return { date: targetDate, teachers: [], summary: { total: 0, filled: 0, notFilled: 0 } };

    const scheduled = await db.select({
      employeeId: teachingSubjects.employeeId, employeeName: employees.name,
      subjectName: masterSubjects.nama, className: classes.name,
      classId: teachingSubjects.classId, jamKe: teachingSubjects.jamKe,
      teachingSubjectId: teachingSubjects.id,
    }).from(teachingSubjects)
      .leftJoin(employees, eq(teachingSubjects.employeeId, employees.id))
      .leftJoin(classes, eq(teachingSubjects.classId, classes.id))
      .leftJoin(masterSubjects, eq(teachingSubjects.subjectId, masterSubjects.id))
      .where(and(eq(teachingSubjects.dayOfWeek, jsDay), eq(teachingSubjects.isActive, true)))
      .orderBy(employees.name, teachingSubjects.jamKe);

    const filled = await db.select({ teachingSubjectId: jurnalEntries.teachingSubjectId, status: jurnalEntries.status })
      .from(jurnalEntries).where(eq(jurnalEntries.date, targetDate));
    const filledSet = new Set(filled.map(j => j.teachingSubjectId));

    const teachers = scheduled.map(t => ({
      ...t, filled: filledSet.has(t.teachingSubjectId),
      jurnalStatus: filled.find(j => j.teachingSubjectId === t.teachingSubjectId)?.status || null,
    }));

    const filledCount = teachers.filter(t => t.filled).length;
    return { date: targetDate, teachers, summary: { total: teachers.length, filled: filledCount, notFilled: teachers.length - filledCount } };
  }

  // ─── Recap ────────────────────────────────────────────────────────────

  static async getJurnalRecap(filters: { dateFrom: string; dateTo: string; teacherId?: string; classId?: string }) {
    const conditions: any[] = [sql`${jurnalEntries.date} >= ${filters.dateFrom}`, sql`${jurnalEntries.date} <= ${filters.dateTo}`];
    if (filters.teacherId) conditions.push(eq(jurnalEntries.teacherId, filters.teacherId));
    if (filters.classId) conditions.push(eq(jurnalEntries.classId, filters.classId));

    const results = await db.select({
      teacherName: employees.name, className: classes.name, subjectName: masterSubjects.nama,
      date: jurnalEntries.date, jamKe: jurnalEntries.jamKe, materiPembelajaran: jurnalEntries.materiPembelajaran,
      metode: jurnalEntries.metode, catatan: jurnalEntries.catatan, evaluasi: jurnalEntries.evaluasi,
      jumlahHadir: jurnalEntries.jumlahHadir, totalSiswa: jurnalEntries.totalSiswa, status: jurnalEntries.status,
    }).from(jurnalEntries)
      .leftJoin(employees, eq(jurnalEntries.teacherId, employees.id))
      .leftJoin(classes, eq(jurnalEntries.classId, classes.id))
      .leftJoin(masterSubjects, eq(jurnalEntries.subjectId, masterSubjects.id))
      .where(and(...conditions)).orderBy(jurnalEntries.date, jurnalEntries.jamKe);

    const statusCounts = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    for (const r of results) { if (r.status && r.status in statusCounts) statusCounts[r.status as keyof typeof statusCounts]++; }
    return { entries: results, summary: { totalEntries: results.length, ...statusCounts } };
  }

  // ─── Templates ────────────────────────────────────────────────────────

  static async getTemplates(teacherId: string) {
    return db.select().from(jurnalTemplates).where(eq(jurnalTemplates.teacherId, teacherId)).orderBy(desc(jurnalTemplates.usageCount));
  }

  static async createTemplate(data: { teacherId: string; subjectName: string; title: string; content: string }) {
    return (await db.insert(jurnalTemplates).values(data).returning())[0];
  }

  static async useTemplate(id: string) {
    await db.update(jurnalTemplates).set({ usageCount: sql`${jurnalTemplates.usageCount} + 1`, updatedAt: new Date() }).where(eq(jurnalTemplates.id, id));
    return (await db.select().from(jurnalTemplates).where(eq(jurnalTemplates.id, id)).limit(1))[0];
  }

  static async deleteTemplate(id: string) {
    return (await db.delete(jurnalTemplates).where(eq(jurnalTemplates.id, id)).returning())[0];
  }

  // ─── Time Slots (Kelola Waktu Pelajaran) ──────────────────────────────

  static async getTimeSlots(dayOfWeek?: number) {
    const conditions: any[] = [eq(jurnalTimeSlots.isActive, true)];
    if (dayOfWeek) conditions.push(eq(jurnalTimeSlots.dayOfWeek, dayOfWeek));
    return db.select().from(jurnalTimeSlots)
      .where(and(...conditions))
      .orderBy(jurnalTimeSlots.dayOfWeek, jurnalTimeSlots.jamKe);
  }

  static async upsertTimeSlots(slots: { dayOfWeek: number; jamKe: number; waktuMulai: string; waktuSelesai: string; label?: string }[]) {
    if (!slots.length) return [];
    const results: any[] = [];
    for (const slot of slots) {
      if (!slot.waktuMulai || !slot.waktuSelesai) continue;
      // Try to find existing
      const existing = await db.select().from(jurnalTimeSlots)
        .where(and(eq(jurnalTimeSlots.dayOfWeek, slot.dayOfWeek), eq(jurnalTimeSlots.jamKe, slot.jamKe)))
        .limit(1);
      if (existing.length > 0) {
        const updated = await db.update(jurnalTimeSlots)
          .set({ waktuMulai: slot.waktuMulai, waktuSelesai: slot.waktuSelesai, label: slot.label || null, updatedAt: new Date() })
          .where(eq(jurnalTimeSlots.id, existing[0].id))
          .returning();
        results.push(updated[0]);
      } else {
        const inserted = await db.insert(jurnalTimeSlots)
          .values({ dayOfWeek: slot.dayOfWeek, jamKe: slot.jamKe, waktuMulai: slot.waktuMulai, waktuSelesai: slot.waktuSelesai, label: slot.label || null })
          .returning();
        results.push(inserted[0]);
      }
    }
    return results;
  }

  static async copyTimeSlots(fromDay: number, toDay: number) {
    const sourceSlots = await db.select().from(jurnalTimeSlots)
      .where(and(eq(jurnalTimeSlots.dayOfWeek, fromDay), eq(jurnalTimeSlots.isActive, true)))
      .orderBy(jurnalTimeSlots.jamKe);
    if (!sourceSlots.length) return [];

    // Delete existing slots for target day
    await db.delete(jurnalTimeSlots).where(eq(jurnalTimeSlots.dayOfWeek, toDay));

    // Insert copied slots
    const newSlots = sourceSlots.map(s => ({
      dayOfWeek: toDay,
      jamKe: s.jamKe,
      waktuMulai: s.waktuMulai,
      waktuSelesai: s.waktuSelesai,
      label: s.label,
    }));
    return db.insert(jurnalTimeSlots).values(newSlots).returning();
  }

  static async deleteTimeSlot(id: string) {
    return (await db.delete(jurnalTimeSlots).where(eq(jurnalTimeSlots.id, id)).returning())[0];
  }

  // ─── Teaching Methods (Shared) ───────────────────────────────

  static async getTeachingMethods() {
    return db.select().from(teachingMethods).orderBy(teachingMethods.name);
  }

  static async createTeachingMethod(name: string, createdBy?: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nama metode tidak boleh kosong');
    const results = await db.insert(teachingMethods).values({ name: trimmed, createdBy }).returning();
    return results[0];
  }
}
