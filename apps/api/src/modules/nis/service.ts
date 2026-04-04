import { db } from "../../db";
import { academicYears, nisBatches, nisActivityLogs, studentProfiles, user } from "../../db/schema";
import { eq, desc, sql, ilike, or, and, isNull, count } from "drizzle-orm";

export class NISService {
  // ─── Dashboard Stats ───
  static async getStats() {
    const totalStudents = await db.select({ count: count() }).from(studentProfiles);
    const withoutNIS = await db.select({ count: count() }).from(studentProfiles)
      .where(or(isNull(studentProfiles.nis), eq(studentProfiles.nis, '')));
    const activeYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1);

    return {
      totalStudents: totalStudents[0]?.count || 0,
      withoutNIS: withoutNIS[0]?.count || 0,
      activeYear: activeYear[0] || null
    };
  }

  // ─── Academic Years ───
  static async getAcademicYears() {
    return db.select().from(academicYears).orderBy(desc(academicYears.createdAt));
  }

  static async createAcademicYear(data: {
    tahunAjaran: string;
    kodeTahun: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    isActive?: boolean;
  }) {
    // If setting as active, deactivate all others first
    if (data.isActive) {
      await db.update(academicYears).set({ isActive: false });
    }
    const results = await db.insert(academicYears).values(data).returning();
    return results[0];
  }

  static async setActiveYear(id: string) {
    // Deactivate all, then activate the selected one
    await db.update(academicYears).set({ isActive: false });
    const results = await db.update(academicYears)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(academicYears.id, id))
      .returning();
    return results[0];
  }

  static async getActiveYear() {
    const results = await db.select().from(academicYears)
      .where(eq(academicYears.isActive, true)).limit(1);
    return results[0] || null;
  }

  // ─── Recent Activity ───
  static async getRecentActivity(limit = 10) {
    const logs = await db.select({
      id: nisActivityLogs.id,
      action: nisActivityLogs.action,
      details: nisActivityLogs.details,
      nisValue: nisActivityLogs.nisValue,
      createdAt: nisActivityLogs.createdAt,
      studentName: studentProfiles.fullName,
      userName: user.name,
    })
    .from(nisActivityLogs)
    .leftJoin(studentProfiles, eq(nisActivityLogs.studentId, studentProfiles.id))
    .leftJoin(user, eq(nisActivityLogs.userId, user.id))
    .orderBy(desc(nisActivityLogs.createdAt))
    .limit(limit);

    return logs;
  }

  // ─── Preview Batch NIS (without saving) ───
  static async previewBatchNIS(studentIds: string[], academicYearId: string) {
    const year = await db.select().from(academicYears)
      .where(eq(academicYears.id, academicYearId)).limit(1);
    if (!year[0]) throw new Error("Tahun ajaran tidak ditemukan");

    const kodeTahun = year[0].kodeTahun;
    const lastSeq = year[0].lastNisSequence || 0;

    // Fetch students
    const students = await db.select().from(studentProfiles)
      .where(sql`${studentProfiles.id} = ANY(${studentIds})`);

    // Sort alphabetically
    students.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'id'));

    // Generate preview
    const preview = students.map((s, idx) => {
      const seq = lastSeq + idx + 1;
      const nis = `${kodeTahun}${String(seq).padStart(4, '0')}`;
      return {
        id: s.id,
        fullName: s.fullName,
        nisn: s.nisn,
        className: s.className,
        currentNis: s.nis,
        sequence: seq,
        newNis: nis,
      };
    });

    return {
      kodeTahun,
      startSequence: lastSeq + 1,
      endSequence: lastSeq + students.length,
      totalStudents: students.length,
      preview
    };
  }

  // ─── Generate Batch NIS (commit to DB) ───
  static async generateBatchNIS(academicYearId: string, studentIds: string[], operatorId?: string) {
    const year = await db.select().from(academicYears)
      .where(eq(academicYears.id, academicYearId)).limit(1);
    if (!year[0]) throw new Error("Tahun ajaran tidak ditemukan");

    const kodeTahun = year[0].kodeTahun;
    let currentSeq = year[0].lastNisSequence || 0;

    // Fetch & sort students
    const students = await db.select().from(studentProfiles)
      .where(sql`${studentProfiles.id} = ANY(${studentIds})`);
    students.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'id'));

    const startSeq = currentSeq + 1;
    const generated: { id: string; fullName: string | null; nis: string }[] = [];

    // Update each student's NIS
    for (const student of students) {
      currentSeq++;
      const nis = `${kodeTahun}${String(currentSeq).padStart(4, '0')}`;

      // Check for duplicates
      const existing = await db.select({ id: studentProfiles.id })
        .from(studentProfiles).where(eq(studentProfiles.nis, nis)).limit(1);
      if (existing.length > 0 && existing[0].id !== student.id) {
        throw new Error(`NIS ${nis} sudah digunakan oleh siswa lain`);
      }

      await db.update(studentProfiles)
        .set({ nis, updatedAt: new Date() })
        .where(eq(studentProfiles.id, student.id));

      generated.push({ id: student.id, fullName: student.fullName, nis });

      // Log each assignment
      await db.insert(nisActivityLogs).values({
        action: 'batch_generate',
        details: JSON.stringify({ batchAcademicYear: year[0].tahunAjaran }),
        studentId: student.id,
        nisValue: nis,
        userId: operatorId || null,
      });
    }

    // Update last sequence
    await db.update(academicYears)
      .set({ lastNisSequence: currentSeq, updatedAt: new Date() })
      .where(eq(academicYears.id, academicYearId));

    // Insert batch record
    await db.insert(nisBatches).values({
      academicYearId,
      jumlahSiswa: students.length,
      startSequence: startSeq,
      endSequence: currentSeq,
      operator: operatorId || null,
    });

    return {
      totalGenerated: generated.length,
      startSequence: startSeq,
      endSequence: currentSeq,
      generated
    };
  }

  // ─── Get Next Sequence ───
  static async getNextSequence(academicYearId: string) {
    const year = await db.select().from(academicYears)
      .where(eq(academicYears.id, academicYearId)).limit(1);
    if (!year[0]) throw new Error("Tahun ajaran tidak ditemukan");

    return {
      kodeTahun: year[0].kodeTahun,
      lastSequence: year[0].lastNisSequence || 0,
      nextSequence: (year[0].lastNisSequence || 0) + 1,
      nextNis: `${year[0].kodeTahun}${String((year[0].lastNisSequence || 0) + 1).padStart(4, '0')}`
    };
  }

  // ─── Assign Single NIS (Mutasi) ───
  static async assignSingleNIS(data: {
    fullName: string;
    nisn: string;
    gender?: string;
    birthPlace?: string;
    birthDate?: string;
    address?: string;
    asalSekolah?: string;
    className?: string;
    academicYearId: string;
  }, operatorId?: string) {
    const year = await db.select().from(academicYears)
      .where(eq(academicYears.id, data.academicYearId)).limit(1);
    if (!year[0]) throw new Error("Tahun ajaran tidak ditemukan");

    const newSeq = (year[0].lastNisSequence || 0) + 1;
    const nis = `${year[0].kodeTahun}${String(newSeq).padStart(4, '0')}`;

    // Check duplicate NIS
    const existing = await db.select({ id: studentProfiles.id })
      .from(studentProfiles).where(eq(studentProfiles.nis, nis)).limit(1);
    if (existing.length > 0) throw new Error(`NIS ${nis} sudah digunakan`);

    // Check duplicate NISN
    const existingNisn = await db.select({ id: studentProfiles.id })
      .from(studentProfiles).where(eq(studentProfiles.nisn, data.nisn)).limit(1);

    let student;
    if (existingNisn.length > 0) {
      // Update existing student with NIS
      const updated = await db.update(studentProfiles)
        .set({
          nis,
          fullName: data.fullName,
          gender: data.gender || null,
          birthPlace: data.birthPlace || null,
          birthDate: data.birthDate || null,
          address: data.address || null,
          className: data.className || null,
          status: 'mutasi',
          updatedAt: new Date()
        })
        .where(eq(studentProfiles.id, existingNisn[0].id))
        .returning();
      student = updated[0];
    } else {
      // Create new student profile with NIS
      const created = await db.insert(studentProfiles).values({
        fullName: data.fullName,
        nisn: data.nisn,
        nis,
        gender: data.gender || null,
        birthPlace: data.birthPlace || null,
        birthDate: data.birthDate || null,
        address: data.address || null,
        className: data.className || null,
        status: 'mutasi',
      }).returning();
      student = created[0];
    }

    // Update sequence
    await db.update(academicYears)
      .set({ lastNisSequence: newSeq, updatedAt: new Date() })
      .where(eq(academicYears.id, data.academicYearId));

    // Activity log
    await db.insert(nisActivityLogs).values({
      action: 'single_assign',
      details: JSON.stringify({ type: 'mutasi', asalSekolah: data.asalSekolah }),
      studentId: student.id,
      nisValue: nis,
      userId: operatorId || null,
    });

    return { student, nis, sequence: newSeq };
  }

  // ─── NIS Records with filters ───
  static async getAllRecords(filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];

    if (filters.search) {
      const q = `%${filters.search}%`;
      whereConditions.push(
        or(
          ilike(studentProfiles.fullName, q),
          ilike(studentProfiles.nis, q),
          ilike(studentProfiles.nisn, q)
        )
      );
    }

    if (filters.status) {
      whereConditions.push(eq(studentProfiles.status, filters.status));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const records = await db.select().from(studentProfiles)
      .where(whereClause)
      .orderBy(studentProfiles.nis, studentProfiles.fullName)
      .limit(limit)
      .offset(offset);

    const totalResult = await db.select({ count: count() }).from(studentProfiles)
      .where(whereClause);

    return {
      records,
      total: totalResult[0]?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult[0]?.count || 0) / limit)
    };
  }

  // ─── Edit NIS ───
  static async editNIS(studentId: string, newNis: string, operatorId?: string) {
    // Get old NIS
    const student = await db.select().from(studentProfiles)
      .where(eq(studentProfiles.id, studentId)).limit(1);
    if (!student[0]) throw new Error("Siswa tidak ditemukan");

    const oldNis = student[0].nis;

    // Check duplicate
    const existing = await db.select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.nis, newNis), sql`${studentProfiles.id} != ${studentId}`))
      .limit(1);
    if (existing.length > 0) throw new Error(`NIS ${newNis} sudah digunakan oleh siswa lain`);

    // Update
    await db.update(studentProfiles)
      .set({ nis: newNis, updatedAt: new Date() })
      .where(eq(studentProfiles.id, studentId));

    // Log
    await db.insert(nisActivityLogs).values({
      action: 'edit',
      details: JSON.stringify({ oldNis, newNis }),
      studentId,
      nisValue: newNis,
      userId: operatorId || null,
    });

    return { oldNis, newNis };
  }

  // ─── Check Duplicate ───
  static async checkDuplicate(nis: string, excludeStudentId?: string) {
    let query = db.select({ id: studentProfiles.id, fullName: studentProfiles.fullName })
      .from(studentProfiles)
      .where(eq(studentProfiles.nis, nis))
      .limit(1);

    const results = await query;
    if (results.length === 0) return { isDuplicate: false };
    if (excludeStudentId && results[0].id === excludeStudentId) return { isDuplicate: false };

    return { isDuplicate: true, existingStudent: results[0] };
  }

  // ─── Students without NIS (for batch selection) ───
  static async getStudentsWithoutNIS() {
    return db.select().from(studentProfiles)
      .where(or(isNull(studentProfiles.nis), eq(studentProfiles.nis, '')))
      .orderBy(studentProfiles.fullName);
  }

  // ─── Batch history ───
  static async getBatchHistory() {
    const batches = await db.select({
      id: nisBatches.id,
      jumlahSiswa: nisBatches.jumlahSiswa,
      startSequence: nisBatches.startSequence,
      endSequence: nisBatches.endSequence,
      status: nisBatches.status,
      createdAt: nisBatches.createdAt,
      tahunAjaran: academicYears.tahunAjaran,
      operatorName: user.name,
    })
    .from(nisBatches)
    .leftJoin(academicYears, eq(nisBatches.academicYearId, academicYears.id))
    .leftJoin(user, eq(nisBatches.operator, user.id))
    .orderBy(desc(nisBatches.createdAt));

    return batches;
  }
}
