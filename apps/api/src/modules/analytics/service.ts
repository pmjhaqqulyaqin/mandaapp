import { db } from "../../db";
import { studentProfiles, employees, attendanceRecords, suratMasuks, suratKeluars, serviceRequests, schoolEvents, classSchedules, jurnalEntries, classes, user } from "../../db/schema";
import { eq, and, sql, gte, lte, desc, count } from "drizzle-orm";

export class AnalyticsService {
  static async getSummary() {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(today.slice(0, 7) + "-01");

    const [
      studentsResult,
      employeesResult,
      attendanceTodayResult,
      suratMasukResult,
      suratKeluarResult,
      ticketPendingResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(studentProfiles).where(eq(studentProfiles.status, "active")),
      db.select({ count: count() }).from(employees),
      db.select({ count: count() }).from(attendanceRecords).where(eq(attendanceRecords.date, today)),
      db.select({ count: count() }).from(suratMasuks).where(gte(suratMasuks.tanggalDiterima, monthStart)),
      db.select({ count: count() }).from(suratKeluars).where(gte(suratKeluars.tanggalGenerate, monthStart)),
      db.select({ count: count() }).from(serviceRequests).where(eq(serviceRequests.status, "pending")),
    ]);

    const totalStudents = studentsResult[0]?.count || 0;
    const attendanceToday = attendanceTodayResult[0]?.count || 0;

    return {
      totalSiswa: totalStudents,
      totalGTK: employeesResult[0]?.count || 0,
      kehadiranHariIni: attendanceToday,
      totalSiswaAll: totalStudents,
      persenKehadiran: totalStudents > 0 ? Math.round((attendanceToday / totalStudents) * 100) : 0,
      suratMasuk: suratMasukResult[0]?.count || 0,
      suratKeluar: suratKeluarResult[0]?.count || 0,
      tiketPending: ticketPendingResult[0]?.count || 0,
    };
  }

  static async getClassroomMonitor() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = today.toISOString().split("T")[0];

    const schedules = await db.select({
      id: classSchedules.id,
      time: classSchedules.time,
      ampm: classSchedules.ampm,
      subject: classSchedules.subject,
      className: classSchedules.className,
      location: classSchedules.location,
      teacherId: classSchedules.teacherId,
      teacherName: user.name,
    })
      .from(classSchedules)
      .leftJoin(user, eq(classSchedules.teacherId, user.id))
      .where(and(
        eq(classSchedules.dayOfWeek, dayOfWeek),
        eq(classSchedules.isActive, true),
      ))
      .orderBy(classSchedules.time);

    const jurnals = await db.select({
      classId: jurnalEntries.classId,
      teacherId: jurnalEntries.teacherId,
      jamKe: jurnalEntries.jamKe,
      subjectName: jurnalEntries.subjectName,
      status: jurnalEntries.status,
      className: classes.name,
    })
      .from(jurnalEntries)
      .leftJoin(classes, eq(jurnalEntries.classId, classes.id))
      .where(eq(jurnalEntries.date, todayStr));

    const filledSet = new Set<string>();
    jurnals.forEach(j => {
      if (j.className) {
        filledSet.add(`${j.className}-${j.subjectName}`.toLowerCase());
        if (j.jamKe) filledSet.add(`${j.className}-${j.jamKe}`.toLowerCase());
      }
    });

    const result = schedules.map(s => {
      const key1 = `${s.className}-${s.subject}`.toLowerCase();
      const isFilled = filledSet.has(key1);
      return { ...s, isFilled, statusLabel: isFilled ? "Terisi" : "Belum Terisi" };
    });

    return {
      dayOfWeek,
      dayName: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayOfWeek],
      totalJadwal: schedules.length,
      totalTerisi: result.filter(r => r.isFilled).length,
      totalKosong: result.filter(r => !r.isFilled).length,
      schedules: result,
    };
  }

  static async getRecentActivity(limit: number = 15) {
    const activities: any[] = [];

    try {
      const recentScans = await db.select({
        id: attendanceRecords.id, date: attendanceRecords.createdAt,
        title: studentProfiles.fullName, detail: attendanceRecords.status,
      })
        .from(attendanceRecords)
        .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
        .orderBy(desc(attendanceRecords.createdAt)).limit(5);

      recentScans.forEach(r => activities.push({
        id: r.id, type: 'attendance', title: r.title, detail: r.detail, time: r.date,
      }));
    } catch {}

    try {
      const recentSuratMasuk = await db.select({
        id: suratMasuks.id, date: suratMasuks.tanggalDiterima,
        perihal: suratMasuks.perihal, pengirim: suratMasuks.pengirim,
      })
        .from(suratMasuks).orderBy(desc(suratMasuks.tanggalDiterima)).limit(5);

      recentSuratMasuk.forEach(r => activities.push({
        id: r.id, type: 'surat_masuk', title: r.perihal || 'Surat Masuk', detail: r.pengirim || '', time: r.date,
      }));
    } catch {}

    try {
      const recentTickets = await db.select({
        id: serviceRequests.id, date: serviceRequests.createdAt,
        name: serviceRequests.applicantName, service: serviceRequests.type, status: serviceRequests.status,
      })
        .from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(5);

      recentTickets.forEach(r => activities.push({
        id: r.id, type: 'ptsp', title: r.name || 'Tiket PTSP', detail: `${r.service} (${r.status})`, time: r.date,
      }));
    } catch {}

    activities.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return tb - ta;
    });

    return activities.slice(0, limit);
  }

  static async getUpcomingEvents(limit: number = 5) {
    const today = new Date().toISOString().split("T")[0];
    return db.select({
      id: schoolEvents.id, title: schoolEvents.title,
      startDate: schoolEvents.eventDate, endDate: schoolEvents.endDate,
      category: schoolEvents.category,
    })
      .from(schoolEvents)
      .where(gte(schoolEvents.eventDate, today))
      .orderBy(schoolEvents.eventDate)
      .limit(limit);
  }

  static async getIKMSummary() {
    try {
      const surveys = await db.select({ formData: serviceRequests.formData })
        .from(serviceRequests)
        .where(eq(serviceRequests.type, "survey-layanan"));

      if (surveys.length === 0) return { totalResponden: 0, skorRataRata: 0, indexPct: 0 };

      let totalScore = 0, totalQuestions = 0;
      const qKeys = ['q1','q2','q3','q4','q5','q6','q7','q8','q9'];

      surveys.forEach(s => {
        try {
          const fd = typeof s.formData === 'string' ? JSON.parse(s.formData as string) : s.formData;
          if (!fd) return;
          qKeys.forEach(k => {
            const val = parseInt(fd[k]);
            if (!isNaN(val) && val >= 1 && val <= 4) { totalScore += val; totalQuestions++; }
          });
        } catch {}
      });

      const avg = totalQuestions > 0 ? totalScore / totalQuestions : 0;
      return {
        totalResponden: surveys.length,
        skorRataRata: Math.round(avg * 100) / 100,
        indexPct: Math.round((avg / 4) * 100 * 10) / 10,
      };
    } catch {
      return { totalResponden: 0, skorRataRata: 0, indexPct: 0 };
    }
  }
}
