import { db } from "../../db";
import { attendanceRecords, attendanceSettings, studentProfiles, classes, siteSettings } from "../../db/schema";
import { eq, and, or, sql, desc, count, isNotNull, isNull } from "drizzle-orm";
import { sendParentAttendanceEmail } from "../../lib/mailer";
import { ParentPortalService } from "../parent-portal/service";

const VALID_STATUSES = ["Hadir", "Terlambat", "Alpa", "Sakit", "Izin", "Bolos"] as const;
type AttendanceStatus = typeof VALID_STATUSES[number];

/**
 * Convert a Date to WITA (Asia/Makassar, UTC+8) date and time strings.
 * This ensures correct time regardless of server timezone (e.g. UTC in Docker).
 */
function toWITA(date: Date): { dateStr: string; timeStr: string } {
  // Use Intl to get WITA components reliably
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Makassar', hour12: false };
  const parts = new Intl.DateTimeFormat('en-CA', { ...opts, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  // en-CA gives YYYY-MM-DD format
  const dateStr = parts; // "2026-05-19"
  const timeParts = new Intl.DateTimeFormat('en-GB', { ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
  const timeStr = timeParts; // "08:21:30"
  return { dateStr, timeStr };
}

export class AttendanceService {

  // ─── Settings ───────────────────────────────────────────────────────────

  static async getActiveSettings() {
    const results = await db.select().from(attendanceSettings)
      .where(eq(attendanceSettings.isActive, true))
      .limit(1);
    
    if (results.length === 0) {
      // Return defaults matching MAN 2 Lombok Timur config
      return { checkInTime: "06:30", lateTime: "07:30", checkOutTime: "13:00" };
    }
    return results[0];
  }

  static async upsertSettings(data: { checkInTime: string; lateTime: string; checkOutTime: string; academicYearId?: string }) {
    const existing = await db.select().from(attendanceSettings)
      .where(eq(attendanceSettings.isActive, true))
      .limit(1);

    if (existing.length > 0) {
      const results = await db.update(attendanceSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(attendanceSettings.id, existing[0].id))
        .returning();
      return results[0];
    }

    const results = await db.insert(attendanceSettings).values({
      ...data,
      isActive: true,
    }).returning();
    return results[0];
  }

  // ─── Scan / Record Attendance ───────────────────────────────────────────

  /**
   * Process a scan (QR/Barcode/Manual). Core business logic ported from PHP absen_publik.php.
   * - Finds student by NIS
   * - Checks if already scanned today
   * - Auto-detects Hadir vs Terlambat based on settings
   * - Handles check-out (pulang) mode
   */
  static async processScan(nis: string, mode: "masuk" | "pulang", method: string = "qr_scan", recordedBy?: string, offlineTimestamp?: number) {
    // 1. Find student by NIS or NISN (card QR/barcode may contain either)
    const students = await db.select().from(studentProfiles)
      .where(or(eq(studentProfiles.nis, nis), eq(studentProfiles.nisn, nis)))
      .limit(1);

    if (students.length === 0) {
      return { success: false, message: `NIS/NISN '${nis}' tidak ditemukan` };
    }

    const student = students[0];

    // Use offline timestamp if provided (for synced offline scans), otherwise use server time.
    // Guard: reject timestamps older than 3 days to prevent stale data injection.
    let scanTime: Date;
    if (offlineTimestamp && typeof offlineTimestamp === 'number') {
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const age = Date.now() - offlineTimestamp;
      if (age > 0 && age < THREE_DAYS_MS) {
        scanTime = new Date(offlineTimestamp);
      } else {
        scanTime = new Date(); // Fallback to server time if timestamp is too old or in the future
      }
    } else {
      scanTime = new Date();
    }

    // Convert to WITA timezone (UTC+8) — ensures correct time regardless of server TZ
    const { dateStr: today, timeStr: currentTime } = toWITA(scanTime);

    // 2. Get time settings
    const settings = await this.getActiveSettings();

    // 3. Check existing record
    const existing = await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.studentId, student.id),
        eq(attendanceRecords.date, today)
      ))
      .limit(1);

    // 4. Smart auto-detect: first scan = masuk, second scan = pulang (with time guard)
    if (existing.length > 0) {
      // Already checked in today
      if (existing[0].checkOut) {
        return { success: false, message: `${student.fullName} sudah absen masuk & pulang hari ini` };
      }
      // Time guard: only allow auto-pulang after checkOutTime setting
      // This prevents accidental double-scan in the morning from marking "Pulang"
      if (currentTime < settings.checkOutTime) {
        return { 
          success: false, 
          message: `${student.fullName} sudah absen masuk (${existing[0].checkIn?.slice(0, 5)}). Scan pulang dibuka setelah jam ${settings.checkOutTime.slice(0, 5)}.` 
        };
      }
      // Auto check-out (pulang) — only after checkOutTime
      await db.update(attendanceRecords)
        .set({ checkOut: currentTime, updatedAt: new Date() })
        .where(eq(attendanceRecords.id, existing[0].id));
      return {
        success: true,
        status: "Pulang",
        nama: student.fullName,
        nis: student.nis,
        kelas: student.className,
        jam: currentTime.slice(0, 5),
        foto: student.photoUrl || "",
      };
    }

    // 5. First scan today
    // Special case: first scan AFTER checkOutTime = student forgot morning scan
    // Don't auto-mark Alpa — direct to admin for manual input (more forgiving)
    if (currentTime >= settings.checkOutTime) {
      return {
        success: false,
        message: `${student.fullName} belum absen masuk hari ini. Hubungi guru/admin untuk input manual di tab "Manual".`,
      };
    }

    // Normal morning scan = MASUK
    const status: AttendanceStatus = currentTime > settings.lateTime ? "Terlambat" : "Hadir";

    const inserted = await db.insert(attendanceRecords).values({
      studentId: student.id,
      classId: student.classId,
      date: today,
      checkIn: currentTime,
      status,
      method,
      recordedBy: recordedBy || null,
    }).returning();

    // Auto-notify parents if Terlambat (async, non-blocking)
    if (status === 'Terlambat') {
      this.notifyParents(student.id, student.fullName || '', student.className || '', status, today, currentTime.slice(0, 5)).catch(() => {});
    }

    return {
      success: true,
      status,
      nama: student.fullName,
      nis: student.nis,
      kelas: student.className,
      jam: currentTime.slice(0, 5),
      foto: student.photoUrl || "",
    };
  }

  /**
   * Send attendance notification emails to linked parents (non-blocking)
   */
  private static async notifyParents(studentId: string, studentName: string, className: string, status: string, date: string, time: string) {
    try {
      // Check global setting
      const notifSettings = await ParentPortalService.getNotifSettings();
      if (!notifSettings.emailEnabled) return;

      const parents = await ParentPortalService.getParentEmailsForStudent(studentId);
      const portalUrl = process.env.APP_URL ? `${process.env.APP_URL}/portal-ortu` : undefined;

      for (const p of parents) {
        sendParentAttendanceEmail(p.parentEmail, p.parentName || '', studentName, className, status, date, time, portalUrl).catch(() => {});
      }
    } catch (err) {
      console.error('[ATTENDANCE] Failed to notify parents:', err);
    }
  }

  // ─── Manual Input ───────────────────────────────────────────────────────

  static async manualInput(data: {
    studentId: string;
    date: string;
    status: string;
    note?: string;
    recordedBy: string;
  }) {
    if (!VALID_STATUSES.includes(data.status as any)) {
      return { success: false, message: "Status tidak valid" };
    }

    const { dateStr: today } = toWITA(new Date());
    if (data.date > today) {
      return { success: false, message: "Tanggal tidak boleh melebihi hari ini" };
    }

    // Get student info
    const students = await db.select().from(studentProfiles)
      .where(eq(studentProfiles.id, data.studentId))
      .limit(1);
    if (students.length === 0) {
      return { success: false, message: "Siswa tidak ditemukan" };
    }

    const student = students[0];
    const { timeStr: currentTime } = toWITA(new Date());

    // Check existing
    const existing = await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.studentId, data.studentId),
        eq(attendanceRecords.date, data.date)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      const checkIn = ["Hadir", "Terlambat"].includes(data.status) ? (existing[0].checkIn || currentTime) : null;
      await db.update(attendanceRecords)
        .set({
          status: data.status,
          checkIn,
          note: data.note || null,
          method: "manual",
          recordedBy: data.recordedBy,
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, existing[0].id));
    } else {
      // Insert new
      const checkIn = ["Hadir", "Terlambat"].includes(data.status) ? currentTime : null;
      await db.insert(attendanceRecords).values({
        studentId: data.studentId,
        classId: student.classId,
        date: data.date,
        checkIn,
        status: data.status,
        method: "manual",
        note: data.note || null,
        recordedBy: data.recordedBy,
      });
    }

    // Auto-notify parents for Terlambat/Alpa (async, non-blocking)
    if (data.status === 'Terlambat' || data.status === 'Alpa') {
      this.notifyParents(data.studentId, student.fullName || '', student.className || '', data.status, data.date, currentTime.slice(0, 5)).catch(() => {});
    }

    return { success: true, status: data.status, message: "Absensi berhasil disimpan" };
  }

  static async manualBulkInput(data: {
    records: Array<{ studentId: string; status: string; note?: string }>;
    date: string;
    recordedBy: string;
  }) {
    let successCount = 0;
    // Process sequentially for simplicity and safety, can be optimized with batch inserts if needed
    for (const record of data.records) {
      if (!record.studentId || !record.status) continue;
      const result = await this.manualInput({
        studentId: record.studentId,
        date: data.date,
        status: record.status,
        note: record.note,
        recordedBy: data.recordedBy
      });
      if (result.success) successCount++;
    }
    return { success: true, count: successCount };
  }

  // ─── Stats Today ────────────────────────────────────────────────────────

  static async getStatsToday(classId?: string) {
    const { dateStr: today } = toWITA(new Date());

    // Total active students WITH a class assignment (exclude unassigned NIS-only records)
    const totalConditions: any[] = [
      eq(studentProfiles.status, "active"),
      isNotNull(studentProfiles.classId),
    ];
    if (classId) totalConditions.push(eq(studentProfiles.classId, classId));
    const [{ count: totalSiswa }] = await db.select({ count: count() })
      .from(studentProfiles)
      .where(and(...totalConditions));

    // Status breakdown
    const statusBreakdown = await db.select({
      status: attendanceRecords.status,
      total: count(),
    }).from(attendanceRecords)
      .where(classId
        ? and(eq(attendanceRecords.date, today), eq(attendanceRecords.classId, classId))
        : eq(attendanceRecords.date, today)
      )
      .groupBy(attendanceRecords.status);

    // Count pulang
    const [pulangResult] = await db.select({ count: count() }).from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.date, today),
        sql`${attendanceRecords.checkOut} IS NOT NULL`,
        ...(classId ? [eq(attendanceRecords.classId, classId)] : [])
      ));

    const stats: Record<string, number> = {
      total_siswa: Number(totalSiswa),
      Hadir: 0, Terlambat: 0, Alpa: 0, Sakit: 0, Izin: 0, Bolos: 0,
      sudah_absen: 0, pulang: Number(pulangResult.count),
    };

    for (const row of statusBreakdown) {
      stats[row.status] = Number(row.total);
      stats.sudah_absen += Number(row.total);
    }
    stats.belum_absen = stats.total_siswa - stats.sudah_absen;

    return stats;
  }

  // ─── Weekly Stats (Chart) ───────────────────────────────────────────────────

  static async getWeeklyStats(classId?: string) {
    const today = new Date();
    const stats: any[] = [];
    
    // Total active students WITH a class assignment
    const totalConditions: any[] = [
      eq(studentProfiles.status, "active"),
      isNotNull(studentProfiles.classId),
    ];
    if (classId) totalConditions.push(eq(studentProfiles.classId, classId));
    const [{ count: totalSiswa }] = await db.select({ count: count() })
      .from(studentProfiles)
      .where(and(...totalConditions));
    const total = Number(totalSiswa);

    // Get stats for last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const { dateStr: dateStrForDay } = toWITA(d);
      
      const statusBreakdown = await db.select({
        status: attendanceRecords.status,
        total: count(),
      }).from(attendanceRecords)
        .where(classId
          ? and(eq(attendanceRecords.date, dateStrForDay), eq(attendanceRecords.classId, classId))
          : eq(attendanceRecords.date, dateStrForDay)
        )
        .groupBy(attendanceRecords.status);

      const dayStats: Record<string, number | string> = {
        date: dateStrForDay,
        day: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        Hadir: 0, Terlambat: 0, Alpa: 0, Sakit: 0, Izin: 0, Bolos: 0,
        sudah_absen: 0,
        total_siswa: total
      };

      for (const row of statusBreakdown) {
        dayStats[row.status] = Number(row.total);
        dayStats.sudah_absen = (dayStats.sudah_absen as number) + Number(row.total);
      }
      
      stats.push(dayStats);
    }

    return stats;
  }

  // ─── Log Today ──────────────────────────────────────────────────────────

  static async getLogToday(limit: number = 50) {
    const { dateStr: today } = toWITA(new Date());

    const results = await db.select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
      method: attendanceRecords.method,
      createdAt: attendanceRecords.createdAt,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
      foto: studentProfiles.photoUrl,
    })
      .from(attendanceRecords)
      .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
      .where(eq(attendanceRecords.date, today))
      .orderBy(desc(attendanceRecords.createdAt))
      .limit(limit);

    return results;
  }

  // ─── Recap Daily ────────────────────────────────────────────────────────
  // FIX: Use studentProfiles as base table with LEFT JOIN to attendanceRecords
  // so ALL active students appear in the recap, even those without attendance records.

  static async getRecapDaily(date: string, classId?: string) {
    const studentConditions: any[] = [eq(studentProfiles.status, "active")];
    if (classId) studentConditions.push(eq(studentProfiles.classId, classId));

    const results = await db.select({
      studentId: studentProfiles.id,
      status: attendanceRecords.status,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
      note: attendanceRecords.note,
      method: attendanceRecords.method,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
    })
      .from(studentProfiles)
      .leftJoin(attendanceRecords, and(
        eq(attendanceRecords.studentId, studentProfiles.id),
        eq(attendanceRecords.date, date)
      ))
      .where(and(...studentConditions))
      .orderBy(studentProfiles.className, studentProfiles.fullName);

    return results;
  }

  // ─── Recap Monthly (Calendar) ───────────────────────────────────────────
  // FIX: Use studentProfiles as base table with LEFT JOIN to attendanceRecords.

  static async getRecapMonthly(month: number, year: number, classId?: string, studentId?: string) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    const studentConditions: any[] = [eq(studentProfiles.status, "active")];
    if (classId) studentConditions.push(eq(studentProfiles.classId, classId));
    if (studentId) studentConditions.push(eq(studentProfiles.id, studentId));

    const results = await db.select({
      studentId: studentProfiles.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
    })
      .from(studentProfiles)
      .leftJoin(attendanceRecords, and(
        eq(attendanceRecords.studentId, studentProfiles.id),
        sql`${attendanceRecords.date} >= ${startDate}`,
        sql`${attendanceRecords.date} <= ${endDate}`
      ))
      .where(and(...studentConditions))
      .orderBy(studentProfiles.fullName, attendanceRecords.date);

    return results;
  }

  // ─── Recap by Date Range ──────────────────────────────────────────────
  // FIX: Use studentProfiles as base table with LEFT JOIN to attendanceRecords.

  static async getRecapByDateRange(startDate: string, endDate: string, classId?: string, studentId?: string) {
    const studentConditions: any[] = [eq(studentProfiles.status, "active")];
    if (classId) studentConditions.push(eq(studentProfiles.classId, classId));
    if (studentId) studentConditions.push(eq(studentProfiles.id, studentId));

    const results = await db.select({
      studentId: studentProfiles.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
    })
      .from(studentProfiles)
      .leftJoin(attendanceRecords, and(
        eq(attendanceRecords.studentId, studentProfiles.id),
        sql`${attendanceRecords.date} >= ${startDate}`,
        sql`${attendanceRecords.date} <= ${endDate}`
      ))
      .where(and(...studentConditions))
      .orderBy(studentProfiles.fullName, attendanceRecords.date);

    return results;
  }

  // ─── Student History ────────────────────────────────────────────────────

  static async getStudentHistory(studentId: string, limit: number = 60) {
    const results = await db.select().from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, studentId))
      .orderBy(desc(attendanceRecords.date))
      .limit(limit);
    return results;
  }

  // ─── Edit / Delete ──────────────────────────────────────────────────────

  static async updateRecord(id: string, data: { status?: string; note?: string; checkIn?: string; checkOut?: string }) {
    if (data.status && !VALID_STATUSES.includes(data.status as any)) {
      return null;
    }
    const results = await db.update(attendanceRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendanceRecords.id, id))
      .returning();
    return results[0] || null;
  }

  static async deleteRecord(id: string) {
    const results = await db.delete(attendanceRecords)
      .where(eq(attendanceRecords.id, id))
      .returning();
    return results[0] || null;
  }

  // ─── Belum Absen List (server-side, accurate) ──────────────────────────

  static async getBelumList(classId?: string) {
    const { dateStr: today } = toWITA(new Date());

    const studentConditions: any[] = [
      eq(studentProfiles.status, "active"),
      isNotNull(studentProfiles.classId),
    ];
    if (classId) studentConditions.push(eq(studentProfiles.classId, classId));

    const results = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      nisn: studentProfiles.nisn,
      className: studentProfiles.className,
      classId: studentProfiles.classId,
      attendanceId: attendanceRecords.id,
    })
      .from(studentProfiles)
      .leftJoin(attendanceRecords, and(
        eq(attendanceRecords.studentId, studentProfiles.id),
        eq(attendanceRecords.date, today)
      ))
      .where(and(
        ...studentConditions,
        isNull(attendanceRecords.id) // No attendance record for today
      ))
      .orderBy(studentProfiles.className, studentProfiles.fullName);

    return results;
  }

  // ─── Retroactive Fill: Mark remaining un-scanned students as Hadir ─────

  /**
   * For a given date, find all active students (with class) who do NOT have
   * an attendance record yet, and insert a record with status = "Hadir".
   * This is used to fix days when the scanner missed students due to
   * network issues or other technical problems.
   *
   * Returns the count of newly inserted records.
   */
  static async retroactiveFillHadir(date: string, recordedBy: string, classId?: string) {
    const { dateStr: today } = toWITA(new Date());
    if (date > today) {
      return { success: false, message: "Tanggal tidak boleh melebihi hari ini", count: 0 };
    }

    const studentConditions: any[] = [
      eq(studentProfiles.status, "active"),
      isNotNull(studentProfiles.classId),
    ];
    if (classId) studentConditions.push(eq(studentProfiles.classId, classId));

    // Find students without attendance record on the given date
    const missing = await db.select({
      id: studentProfiles.id,
      classId: studentProfiles.classId,
    })
      .from(studentProfiles)
      .leftJoin(attendanceRecords, and(
        eq(attendanceRecords.studentId, studentProfiles.id),
        eq(attendanceRecords.date, date)
      ))
      .where(and(
        ...studentConditions,
        isNull(attendanceRecords.id)
      ));

    if (missing.length === 0) {
      return { success: true, message: "Semua siswa sudah memiliki record absensi", count: 0 };
    }

    // Batch insert
    const values = missing.map(s => ({
      studentId: s.id,
      classId: s.classId,
      date,
      checkIn: "07:00" as string, // Default morning time
      status: "Hadir" as string,
      method: "retroactive_fill" as string,
      note: "Auto-filled: hadir secara faktual namun tidak tercatat oleh sistem",
      recordedBy,
    }));

    await db.insert(attendanceRecords).values(values);

    return {
      success: true,
      message: `${missing.length} siswa berhasil ditandai Hadir`,
      count: missing.length,
    };
  }

  // ─── Belum Absen Export Data (per-class summary + absent student list) ──

  /**
   * Returns per-class attendance summary for today and the list of absent students.
   * Only includes active students with a class assignment (matching dashboard logic).
   * Used by the "Export Belum Absen / Alpa" feature.
   */
  static async getBelumAbsenExportData() {
    const { dateStr: today } = toWITA(new Date());

    // 1. Get all active students with class assignment
    const allStudents = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      className: studentProfiles.className,
      classId: studentProfiles.classId,
    })
      .from(studentProfiles)
      .where(and(
        eq(studentProfiles.status, "active"),
        isNotNull(studentProfiles.classId),
      ))
      .orderBy(studentProfiles.className, studentProfiles.fullName);

    // 2. Get today's attendance records
    const todayRecords = await db.select({
      studentId: attendanceRecords.studentId,
    })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, today));

    const attendedSet = new Set(todayRecords.map(r => r.studentId));

    // 3. Build per-class summary and absent student list
    const classMap = new Map<string, {
      className: string;
      totalStudents: number;
      hadirCount: number;
      belumAbsenCount: number;
      absentStudents: { fullName: string; nis: string; className: string }[];
    }>();

    for (const student of allStudents) {
      const kelas = student.className || 'Tanpa Kelas';
      if (!classMap.has(kelas)) {
        classMap.set(kelas, {
          className: kelas,
          totalStudents: 0,
          hadirCount: 0,
          belumAbsenCount: 0,
          absentStudents: [],
        });
      }
      const entry = classMap.get(kelas)!;
      entry.totalStudents++;
      if (attendedSet.has(student.id)) {
        entry.hadirCount++;
      } else {
        entry.belumAbsenCount++;
        entry.absentStudents.push({
          fullName: student.fullName || '',
          nis: student.nis || '',
          className: kelas,
        });
      }
    }

    const classSummary = Array.from(classMap.values())
      .sort((a, b) => a.className.localeCompare(b.className));

    const totalBelumAbsen = classSummary.reduce((sum, c) => sum + c.belumAbsenCount, 0);

    return {
      date: today,
      totalStudents: allStudents.length,
      totalHadir: allStudents.length - totalBelumAbsen,
      totalBelumAbsen,
      classSummary,
    };
  }
}
