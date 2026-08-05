import { db } from "../../db";
import { studentProfiles, employees, attendanceRecords, suratMasuks, suratKeluars, serviceRequests, schoolEvents, classSchedules, jurnalEntries, classes, user, masterSubjects, teachingSubjects, jurnalTimeSlots } from "../../db/schema";
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
    const now = new Date();
    const jsDayOfWeek = now.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu
    const todayStr = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 8); // "HH:MM:SS"

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const teachingDay = jsDayOfWeek; // 1=Senin..6=Sabtu matches teachingSubjects convention

    if (teachingDay === 0) {
      return {
        dayOfWeek: jsDayOfWeek,
        dayName: dayNames[jsDayOfWeek],
        currentJamKe: null,
        currentTimeSlot: null,
        totalKelas: 0,
        totalTerisi: 0,
        totalKosong: 0,
        schedules: [],
      };
    }

    // 1. Get all time slots for today to determine current jam ke
    const timeSlots = await db.select()
      .from(jurnalTimeSlots)
      .where(and(
        eq(jurnalTimeSlots.dayOfWeek, teachingDay),
        eq(jurnalTimeSlots.isActive, true),
      ))
      .orderBy(jurnalTimeSlots.jamKe);

    // 2. Determine current jam ke based on current time
    let currentJamKe: number | null = null;
    let currentSlotInfo: { waktuMulai: string; waktuSelesai: string } | null = null;

    for (const slot of timeSlots) {
      if (currentTime >= slot.waktuMulai && currentTime < slot.waktuSelesai) {
        currentJamKe = slot.jamKe;
        currentSlotInfo = { waktuMulai: slot.waktuMulai, waktuSelesai: slot.waktuSelesai };
        break;
      }
    }

    // If no exact match, find the most recent completed or upcoming slot
    if (currentJamKe === null && timeSlots.length > 0) {
      // If before first slot, use jam ke 1
      if (currentTime < timeSlots[0].waktuMulai) {
        currentJamKe = timeSlots[0].jamKe;
        currentSlotInfo = { waktuMulai: timeSlots[0].waktuMulai, waktuSelesai: timeSlots[0].waktuSelesai };
      } else {
        // Use the last slot that has started (most recent)
        for (let i = timeSlots.length - 1; i >= 0; i--) {
          if (currentTime >= timeSlots[i].waktuMulai) {
            currentJamKe = timeSlots[i].jamKe;
            currentSlotInfo = { waktuMulai: timeSlots[i].waktuMulai, waktuSelesai: timeSlots[i].waktuSelesai };
            break;
          }
        }
      }
    }

    // 3. Get all active classes
    const allClasses = await db.select({
      id: classes.id,
      name: classes.name,
    }).from(classes).orderBy(classes.name);

    if (allClasses.length === 0) {
      return {
        dayOfWeek: jsDayOfWeek,
        dayName: dayNames[jsDayOfWeek],
        currentJamKe,
        currentTimeSlot: currentSlotInfo,
        totalKelas: 0,
        totalTerisi: 0,
        totalKosong: 0,
        schedules: [],
      };
    }

    // 4. Get teaching schedule for today — find which teacher+subject is assigned to each class for current jam ke
    const todaySchedules = await db.select({
      id: teachingSubjects.id,
      classId: teachingSubjects.classId,
      jamKe: teachingSubjects.jamKe,
      teacherName: employees.name,
      subjectName: masterSubjects.nama,
    })
      .from(teachingSubjects)
      .leftJoin(employees, eq(teachingSubjects.employeeId, employees.id))
      .leftJoin(masterSubjects, eq(teachingSubjects.subjectId, masterSubjects.id))
      .where(and(
        eq(teachingSubjects.dayOfWeek, teachingDay),
        eq(teachingSubjects.isActive, true),
      ));

    // Build map: classId -> schedule info for current jam ke
    // jamKe in teachingSubjects is varchar like "1-2", "3-4" — parse to check if current jam is within range
    const classScheduleMap = new Map<string, { teacherName: string; subjectName: string; teachingSubjectId: string; jamKe: string }>();

    todaySchedules.forEach(s => {
      if (!s.classId || !s.jamKe || currentJamKe === null) return;
      // Parse jamKe: can be "1-2", "3", "3-4", etc.
      const parts = s.jamKe.split('-').map(Number);
      const jamStart = parts[0];
      const jamEnd = parts.length > 1 ? parts[1] : parts[0];
      if (currentJamKe >= jamStart && currentJamKe <= jamEnd) {
        classScheduleMap.set(s.classId, {
          teacherName: s.teacherName || '-',
          subjectName: s.subjectName || '-',
          teachingSubjectId: s.id,
          jamKe: s.jamKe,
        });
      }
    });

    // 5. Get jurnal entries for today — check which classes have filled jurnals for current jam ke
    const jurnals = await db.select({
      classId: jurnalEntries.classId,
      jamKe: jurnalEntries.jamKe,
      teachingSubjectId: jurnalEntries.teachingSubjectId,
    })
      .from(jurnalEntries)
      .where(eq(jurnalEntries.date, todayStr));

    // Build set of classIds that have jurnal filled for current jam ke
    const filledClassIds = new Set<string>();
    jurnals.forEach(j => {
      if (!j.classId || currentJamKe === null) return;
      // Check by teachingSubjectId match
      const schedInfo = classScheduleMap.get(j.classId);
      if (schedInfo && j.teachingSubjectId && schedInfo.teachingSubjectId === j.teachingSubjectId) {
        filledClassIds.add(j.classId);
        return;
      }
      // Check by jamKe match
      if (j.jamKe) {
        const parts = j.jamKe.split('-').map(Number);
        const jamStart = parts[0];
        const jamEnd = parts.length > 1 ? parts[1] : parts[0];
        if (currentJamKe >= jamStart && currentJamKe <= jamEnd) {
          filledClassIds.add(j.classId);
        }
      }
    });

    // 6. Build result — one entry per class
    const schedules = allClasses.map(cls => {
      const schedInfo = classScheduleMap.get(cls.id);
      const isFilled = filledClassIds.has(cls.id);

      return {
        classId: cls.id,
        className: cls.name,
        subject: schedInfo?.subjectName || null,
        teacherName: schedInfo?.teacherName || null,
        jamKe: schedInfo?.jamKe || null,
        hasSchedule: !!schedInfo,
        isFilled,
        statusLabel: !schedInfo ? 'Tidak Ada Jadwal' : (isFilled ? 'Terisi' : 'Kosong'),
      };
    });

    // Only count classes that have a schedule for current jam ke
    const scheduledClasses = schedules.filter(s => s.hasSchedule);

    return {
      dayOfWeek: jsDayOfWeek,
      dayName: dayNames[jsDayOfWeek],
      currentJamKe,
      currentTimeSlot: currentSlotInfo,
      totalKelas: allClasses.length,
      totalTerisi: scheduledClasses.filter(r => r.isFilled).length,
      totalKosong: scheduledClasses.filter(r => !r.isFilled).length,
      totalTidakAdaJadwal: schedules.filter(s => !s.hasSchedule).length,
      schedules,
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
