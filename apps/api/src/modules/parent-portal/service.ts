import { db } from "../../db";
import { parentLinks, studentProfiles, classes, attendanceRecords, jurnalEntries, classSchedules, user, employees, siteSettings, masterSubjects } from "../../db/schema";
import { eq, and, desc, count, sql, gte, lte, or } from "drizzle-orm";

export class ParentPortalService {

  /**
   * Pair parent user to student via NISN
   */
  static async pairByNisn(userId: string, nisn: string, relation: string, phone?: string) {
    // Find student by NISN
    const student = await db.select().from(studentProfiles).where(eq(studentProfiles.nisn, nisn)).limit(1);
    if (!student[0]) {
      throw new Error("Siswa dengan NISN tersebut tidak ditemukan.");
    }

    // Check if already paired
    const existing = await db.select().from(parentLinks)
      .where(and(eq(parentLinks.userId, userId), eq(parentLinks.studentId, student[0].id)));
    if (existing.length > 0) {
      throw new Error("Anda sudah terhubung dengan siswa ini.");
    }

    // Create link
    const [link] = await db.insert(parentLinks).values({
      userId,
      studentId: student[0].id,
      relation: relation || "wali",
      phone: phone || null,
    }).returning();

    return { link, student: student[0] };
  }

  /**
   * Get parent's linked children
   */
  static async getLinkedChildren(userId: string) {
    const links = await db.select({
      linkId: parentLinks.id,
      relation: parentLinks.relation,
      phone: parentLinks.phone,
      notificationEmail: parentLinks.notificationEmail,
      notificationWa: parentLinks.notificationWa,
      studentId: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      nisn: studentProfiles.nisn,
      className: studentProfiles.className,
      photoUrl: studentProfiles.photoUrl,
      status: studentProfiles.status,
      classId: studentProfiles.classId,
    })
      .from(parentLinks)
      .innerJoin(studentProfiles, eq(parentLinks.studentId, studentProfiles.id))
      .where(eq(parentLinks.userId, userId));

    return links;
  }

  /**
   * Get student profile with class + wali kelas info
   */
  static async getStudentDetail(studentId: string) {
    const [student] = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      nisn: studentProfiles.nisn,
      className: studentProfiles.className,
      classId: studentProfiles.classId,
      photoUrl: studentProfiles.photoUrl,
      birthPlace: studentProfiles.birthPlace,
      birthDate: studentProfiles.birthDate,
      gender: studentProfiles.gender,
    })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, studentId));

    if (!student) return null;

    // Get wali kelas
    let waliKelas = null;
    if (student.classId) {
      const [cls] = await db.select({
        name: classes.name,
        homeroomTeacherId: classes.homeroomTeacherId,
      }).from(classes).where(eq(classes.id, student.classId));

      if (cls?.homeroomTeacherId) {
        const [wali] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, cls.homeroomTeacherId));
        waliKelas = wali?.name || null;
      }
    }

    return { ...student, waliKelas };
  }

  /**
   * Get attendance summary for a month
   */
  static async getAttendanceSummary(studentId: string, month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const records = await db.select({
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
    })
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.studentId, studentId),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate),
      ))
      .orderBy(attendanceRecords.date);

    // Aggregate
    const summary = { Hadir: 0, Terlambat: 0, Sakit: 0, Izin: 0, Alpa: 0, Bolos: 0 };
    records.forEach(r => {
      const key = r.status as keyof typeof summary;
      if (key in summary) summary[key]++;
    });

    const totalHari = records.length;
    const totalHadir = summary.Hadir + summary.Terlambat;
    const persenHadir = totalHari > 0 ? Math.round((totalHadir / totalHari) * 100) : 0;

    return {
      records,
      summary,
      totalHari,
      totalHadir,
      persenHadir,
      month,
      year,
    };
  }

  /**
   * Get today's jurnal entries for student's class
   */
  static async getJurnalToday(studentId: string) {
    // Get student's class
    const [student] = await db.select({ classId: studentProfiles.classId })
      .from(studentProfiles).where(eq(studentProfiles.id, studentId));
    if (!student?.classId) return [];

    const today = new Date().toISOString().split("T")[0];

    const jurnals = await db.select({
      id: jurnalEntries.id,
      subjectName: masterSubjects.nama,
      jamKe: jurnalEntries.jamKe,
      waktuMulai: jurnalEntries.waktuMulai,
      waktuSelesai: jurnalEntries.waktuSelesai,
      materiPembelajaran: jurnalEntries.materiPembelajaran,
      metode: jurnalEntries.metode,
      capaianPembelajaran: jurnalEntries.capaianPembelajaran,
      kendalaDanSolusi: jurnalEntries.kendalaDanSolusi,
      catatan: jurnalEntries.catatan,
      evaluasi: jurnalEntries.evaluasi,
      jumlahHadir: jurnalEntries.jumlahHadir,
      totalSiswa: jurnalEntries.totalSiswa,
      teacherName: employees.name,
    })
      .from(jurnalEntries)
      .leftJoin(employees, eq(jurnalEntries.teacherId, employees.id))
      .leftJoin(masterSubjects, eq(jurnalEntries.subjectId, masterSubjects.id))
      .where(and(
        eq(jurnalEntries.classId, student.classId),
        eq(jurnalEntries.date, today),
      ))
      .orderBy(jurnalEntries.jamKe);

    return jurnals;
  }

  /**
   * Get today's class schedule
   */
  static async getScheduleToday(studentId: string) {
    const [student] = await db.select({ classId: studentProfiles.classId, className: studentProfiles.className })
      .from(studentProfiles).where(eq(studentProfiles.id, studentId));
    if (!student?.className) return [];

    const dayOfWeek = new Date().getDay();

    return db.select({
      time: classSchedules.time,
      ampm: classSchedules.ampm,
      subject: classSchedules.subject,
      location: classSchedules.location,
      teacherName: user.name,
    })
      .from(classSchedules)
      .leftJoin(user, eq(classSchedules.teacherId, user.id))
      .where(and(
        eq(classSchedules.className, student.className),
        eq(classSchedules.dayOfWeek, dayOfWeek),
        eq(classSchedules.isActive, true),
      ))
      .orderBy(classSchedules.time);
  }

  /**
   * Get weekly attendance trend (last 4 weeks)
   */
  static async getWeeklyTrend(studentId: string) {
    const weeks: any[] = [];
    const now = new Date();

    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (w * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const startStr = weekStart.toISOString().split("T")[0];
      const endStr = weekEnd.toISOString().split("T")[0];

      const records = await db.select({ status: attendanceRecords.status })
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.studentId, studentId),
          gte(attendanceRecords.date, startStr),
          lte(attendanceRecords.date, endStr),
        ));

      const total = records.length;
      const hadir = records.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length;

      weeks.push({
        label: `Mg ${4 - w}`,
        startDate: startStr,
        endDate: endStr,
        total,
        hadir,
        persen: total > 0 ? Math.round((hadir / total) * 100) : 0,
      });
    }

    return weeks;
  }

  /**
   * Remove parent-student link
   */
  static async unlinkChild(linkId: string, userId: string) {
    return db.delete(parentLinks).where(
      and(eq(parentLinks.id, linkId), eq(parentLinks.userId, userId))
    );
  }

  /**
   * Update notification preferences
   */
  static async updateNotification(linkId: string, userId: string, emailEnabled: boolean, waEnabled: boolean) {
    return db.update(parentLinks)
      .set({ notificationEmail: emailEnabled, notificationWa: waEnabled })
      .where(and(eq(parentLinks.id, linkId), eq(parentLinks.userId, userId)));
  }

  /**
   * Get parent links for a student (admin use)
   */
  static async getLinksForStudent(studentId: string) {
    return db.select({
      id: parentLinks.id,
      relation: parentLinks.relation,
      phone: parentLinks.phone,
      notificationEmail: parentLinks.notificationEmail,
      notificationWa: parentLinks.notificationWa,
      parentName: user.name,
      parentEmail: user.email,
      createdAt: parentLinks.createdAt,
    })
      .from(parentLinks)
      .innerJoin(user, eq(parentLinks.userId, user.id))
      .where(eq(parentLinks.studentId, studentId));
  }

  // ─── Admin: Global Notif Settings ──────────────────────────────

  static async getNotifSettings() {
    const rows = await db.select().from(siteSettings).where(
      or(eq(siteSettings.key, 'parent_notif_email'), eq(siteSettings.key, 'parent_notif_wa'))
    );
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value || ''; });
    return {
      emailEnabled: map['parent_notif_email'] !== 'false', // default true
      waEnabled: map['parent_notif_wa'] === 'true',        // default false
    };
  }

  static async updateNotifSettings(emailEnabled: boolean, waEnabled: boolean) {
    for (const [key, val] of [['parent_notif_email', String(emailEnabled)], ['parent_notif_wa', String(waEnabled)]]) {
      const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettings).set({ value: val, updatedAt: new Date() }).where(eq(siteSettings.key, key));
      } else {
        await db.insert(siteSettings).values({ key, value: val, group: 'parent_portal' });
      }
    }
  }

  /**
   * Get parent emails for a student who have email notifications enabled
   */
  static async getParentEmailsForStudent(studentId: string) {
    const links = await db.select({
      parentEmail: user.email,
      parentName: user.name,
      relation: parentLinks.relation,
      notificationEmail: parentLinks.notificationEmail,
    })
      .from(parentLinks)
      .innerJoin(user, eq(parentLinks.userId, user.id))
      .where(and(
        eq(parentLinks.studentId, studentId),
        eq(parentLinks.notificationEmail, true),
      ));
    return links;
  }
}
