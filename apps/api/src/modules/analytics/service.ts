import { db } from "../../db";
import { studentProfiles, employees, attendanceRecords, suratMasuks, suratKeluars, serviceRequests, schoolEvents, classSchedules, jurnalEntries, classes, user, masterSubjects, teachingSubjects } from "../../db/schema";
import { eq, and, sql, gte, lte, desc, count, inArray } from "drizzle-orm";

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
    const jsDayOfWeek = today.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu
    const todayStr = today.toISOString().split("T")[0];

    // teachingSubjects uses 1=Senin..6=Sabtu (no Minggu)
    // JS getDay() returns 0=Minggu, 1=Senin, ..., 6=Sabtu
    // So jsDayOfWeek maps directly (1=Senin=1, 2=Selasa=2, etc.)
    // Minggu (0) has no teaching schedules
    const teachingDay = jsDayOfWeek; // 0=Minggu won't match any teaching_subjects

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    if (teachingDay === 0) {
      // Hari Minggu — tidak ada jadwal mengajar
      return {
        dayOfWeek: jsDayOfWeek,
        dayName: dayNames[jsDayOfWeek],
        totalJadwal: 0,
        totalTerisi: 0,
        totalKosong: 0,
        schedules: [],
      };
    }

    // Query jadwal dari teachingSubjects (sistem KBM/Jurnal yang aktif)
    const schedules = await db.select({
      id: teachingSubjects.id,
      jamKe: teachingSubjects.jamKe,
      waktuMulai: teachingSubjects.waktuMulai,
      waktuSelesai: teachingSubjects.waktuSelesai,
      employeeId: teachingSubjects.employeeId,
      classId: teachingSubjects.classId,
      subjectId: teachingSubjects.subjectId,
      teacherName: employees.name,
      className: classes.name,
      subjectName: masterSubjects.nama,
    })
      .from(teachingSubjects)
      .leftJoin(employees, eq(teachingSubjects.employeeId, employees.id))
      .leftJoin(classes, eq(teachingSubjects.classId, classes.id))
      .leftJoin(masterSubjects, eq(teachingSubjects.subjectId, masterSubjects.id))
      .where(and(
        eq(teachingSubjects.dayOfWeek, teachingDay),
        eq(teachingSubjects.isActive, true),
      ))
      .orderBy(teachingSubjects.waktuMulai, teachingSubjects.jamKe);

    // Query jurnal entries hari ini untuk menentukan mana yang sudah terisi
    const jurnals = await db.select({
      teachingSubjectId: jurnalEntries.teachingSubjectId,
      classId: jurnalEntries.classId,
      subjectId: jurnalEntries.subjectId,
      jamKe: jurnalEntries.jamKe,
    })
      .from(jurnalEntries)
      .where(eq(jurnalEntries.date, todayStr));

    // Build lookup sets for matching
    const filledByTeachingSubjectId = new Set<string>();
    const filledByClassSubject = new Set<string>();
    const filledByClassJamKe = new Set<string>();

    jurnals.forEach(j => {
      if (j.teachingSubjectId) filledByTeachingSubjectId.add(j.teachingSubjectId);
      if (j.classId && j.subjectId) filledByClassSubject.add(`${j.classId}-${j.subjectId}`);
      if (j.classId && j.jamKe) filledByClassJamKe.add(`${j.classId}-${j.jamKe}`);
    });

    const result = schedules.map(s => {
      // Check if filled via multiple matching strategies
      const isFilled =
        filledByTeachingSubjectId.has(s.id) ||
        (s.classId && s.subjectId ? filledByClassSubject.has(`${s.classId}-${s.subjectId}`) : false) ||
        (s.classId && s.jamKe ? filledByClassJamKe.has(`${s.classId}-${s.jamKe}`) : false);

      return {
        id: s.id,
        time: s.waktuMulai || null,
        jamKe: s.jamKe || null,
        subject: s.subjectName || '-',
        className: s.className || '-',
        teacherName: s.teacherName || '-',
        isFilled,
        statusLabel: isFilled ? "Terisi" : "Belum Terisi",
      };
    });

    return {
      dayOfWeek: jsDayOfWeek,
      dayName: dayNames[jsDayOfWeek],
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
