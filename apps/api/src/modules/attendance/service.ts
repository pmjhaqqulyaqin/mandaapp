import { db } from "../../db";
import { attendanceRecords, attendanceSettings, studentProfiles, classes } from "../../db/schema";
import { eq, and, or, sql, desc, count } from "drizzle-orm";

const VALID_STATUSES = ["Hadir", "Terlambat", "Alpa", "Sakit", "Izin", "Bolos"] as const;
type AttendanceStatus = typeof VALID_STATUSES[number];

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
  static async processScan(nis: string, mode: "masuk" | "pulang", method: string = "qr_scan", recordedBy?: string) {
    // 1. Find student by NIS or NISN (card QR/barcode may contain either)
    const students = await db.select().from(studentProfiles)
      .where(or(eq(studentProfiles.nis, nis), eq(studentProfiles.nisn, nis)))
      .limit(1);

    if (students.length === 0) {
      return { success: false, message: `NIS/NISN '${nis}' tidak ditemukan` };
    }

    const student = students[0];
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

    // 2. Get time settings
    const settings = await this.getActiveSettings();

    // 3. Check existing record
    const existing = await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.studentId, student.id),
        eq(attendanceRecords.date, today)
      ))
      .limit(1);

    // 4. Handle PULANG mode
    if (mode === "pulang") {
      if (existing.length === 0) {
        return { success: false, message: `${student.fullName} belum absen masuk hari ini` };
      }
      if (existing[0].checkOut) {
        return { success: false, message: `${student.fullName} sudah absen pulang (${existing[0].checkOut})` };
      }
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

    // 5. Handle MASUK mode
    if (existing.length > 0) {
      // Already checked in — auto-switch to pulang if after check-out time
      if (currentTime >= settings.checkOutTime && !existing[0].checkOut) {
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
      return { success: false, message: `${student.fullName} sudah absen (${existing[0].status})` };
    }

    // 6. Determine status
    const status: AttendanceStatus = currentTime > settings.lateTime ? "Terlambat" : "Hadir";

    // 7. Insert new record
    const inserted = await db.insert(attendanceRecords).values({
      studentId: student.id,
      classId: student.classId,
      date: today,
      checkIn: currentTime,
      status,
      method,
      recordedBy: recordedBy || null,
    }).returning();

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

    const today = new Date().toISOString().split("T")[0];
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
    const currentTime = new Date().toTimeString().slice(0, 8);

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
    const today = new Date().toISOString().split("T")[0];

    // Total active students
    const totalQuery = classId
      ? db.select({ count: count() }).from(studentProfiles).where(and(eq(studentProfiles.classId, classId), eq(studentProfiles.status, "active")))
      : db.select({ count: count() }).from(studentProfiles).where(eq(studentProfiles.status, "active"));
    const [{ count: totalSiswa }] = await totalQuery;

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
    
    // Total active students for percentage calculation
    const totalQuery = classId
      ? db.select({ count: count() }).from(studentProfiles).where(and(eq(studentProfiles.classId, classId), eq(studentProfiles.status, "active")))
      : db.select({ count: count() }).from(studentProfiles).where(eq(studentProfiles.status, "active"));
    const [{ count: totalSiswa }] = await totalQuery;
    const total = Number(totalSiswa);

    // Get stats for last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      const statusBreakdown = await db.select({
        status: attendanceRecords.status,
        total: count(),
      }).from(attendanceRecords)
        .where(classId
          ? and(eq(attendanceRecords.date, dateStr), eq(attendanceRecords.classId, classId))
          : eq(attendanceRecords.date, dateStr)
        )
        .groupBy(attendanceRecords.status);

      const dayStats: Record<string, number | string> = {
        date: dateStr,
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
    const today = new Date().toISOString().split("T")[0];

    const results = await db.select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
      method: attendanceRecords.method,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
      foto: studentProfiles.photoUrl,
    })
      .from(attendanceRecords)
      .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
      .where(eq(attendanceRecords.date, today))
      .orderBy(desc(attendanceRecords.updatedAt))
      .limit(limit);

    return results;
  }

  // ─── Recap Daily ────────────────────────────────────────────────────────

  static async getRecapDaily(date: string, classId?: string) {
    const conditions = [eq(attendanceRecords.date, date)];
    if (classId) conditions.push(eq(attendanceRecords.classId, classId));

    const results = await db.select({
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
      checkIn: attendanceRecords.checkIn,
      checkOut: attendanceRecords.checkOut,
      note: attendanceRecords.note,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
    })
      .from(attendanceRecords)
      .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
      .where(and(...conditions));

    return results;
  }

  // ─── Recap Monthly (Calendar) ───────────────────────────────────────────

  static async getRecapMonthly(month: number, year: number, classId?: string, studentId?: string) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    const conditions = [
      sql`${attendanceRecords.date} >= ${startDate}`,
      sql`${attendanceRecords.date} <= ${endDate}`,
    ];
    if (classId) conditions.push(eq(attendanceRecords.classId, classId));
    if (studentId) conditions.push(eq(attendanceRecords.studentId, studentId));

    const results = await db.select({
      studentId: attendanceRecords.studentId,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      nama: studentProfiles.fullName,
      nis: studentProfiles.nis,
      kelas: studentProfiles.className,
    })
      .from(attendanceRecords)
      .innerJoin(studentProfiles, eq(attendanceRecords.studentId, studentProfiles.id))
      .where(and(...conditions))
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
}
