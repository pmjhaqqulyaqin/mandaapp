import { db } from "../../db";
import * as schema from "../../db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// e-Rapor Service — Nilai Sumatif Kurikulum Merdeka (KMA 450/2024)
// ═══════════════════════════════════════════════════════════════

// ── Config (Bobot & KKTP) ──────────────────────────────────────

export async function getConfig(academicYearId: string, semester: string, classId?: string, subjectId?: string) {
  // Try specific config first, then fall back to global default
  const conditions = [
    eq(schema.raporConfig.academicYearId, academicYearId),
    eq(schema.raporConfig.semester, semester),
  ];

  if (classId && subjectId) {
    // Try most specific first
    const specific = await db.select().from(schema.raporConfig)
      .where(and(...conditions, eq(schema.raporConfig.classId, classId), eq(schema.raporConfig.subjectId, subjectId)))
      .limit(1);
    if (specific.length > 0) return specific[0];
  }

  // Fall back to global config (null classId/subjectId)
  const global = await db.select().from(schema.raporConfig)
    .where(and(...conditions, sql`${schema.raporConfig.classId} IS NULL`, sql`${schema.raporConfig.subjectId} IS NULL`))
    .limit(1);

  if (global.length > 0) return global[0];

  // Return defaults if nothing configured
  return { bobotTp: 60, bobotSas: 40, kktp: 75 };
}

export async function upsertConfig(data: {
  academicYearId: string;
  semester: string;
  classId?: string | null;
  subjectId?: string | null;
  bobotTp: number;
  bobotSas: number;
  kktp: number;
}) {
  const conditions = [
    eq(schema.raporConfig.academicYearId, data.academicYearId),
    eq(schema.raporConfig.semester, data.semester),
  ];

  if (data.classId) {
    conditions.push(eq(schema.raporConfig.classId, data.classId));
  } else {
    conditions.push(sql`${schema.raporConfig.classId} IS NULL`);
  }

  if (data.subjectId) {
    conditions.push(eq(schema.raporConfig.subjectId, data.subjectId));
  } else {
    conditions.push(sql`${schema.raporConfig.subjectId} IS NULL`);
  }

  const existing = await db.select().from(schema.raporConfig).where(and(...conditions)).limit(1);

  if (existing.length > 0) {
    await db.update(schema.raporConfig)
      .set({
        bobotTp: data.bobotTp,
        bobotSas: data.bobotSas,
        kktp: data.kktp,
        updatedAt: new Date(),
      })
      .where(eq(schema.raporConfig.id, existing[0].id));
    return { ...existing[0], ...data };
  } else {
    const [result] = await db.insert(schema.raporConfig)
      .values({
        academicYearId: data.academicYearId,
        semester: data.semester,
        classId: data.classId || null,
        subjectId: data.subjectId || null,
        bobotTp: data.bobotTp,
        bobotSas: data.bobotSas,
        kktp: data.kktp,
      })
      .returning();
    return result;
  }
}

// ── Tujuan Pembelajaran (TP) ───────────────────────────────────

export async function getTujuanPembelajaran(academicYearId: string, semester: string, subjectId: string) {
  return db.select().from(schema.raporTp)
    .where(and(
      eq(schema.raporTp.academicYearId, academicYearId),
      eq(schema.raporTp.semester, semester),
      eq(schema.raporTp.subjectId, subjectId),
    ))
    .orderBy(asc(schema.raporTp.nomorTp));
}

export async function upsertTujuanPembelajaran(data: {
  academicYearId: string;
  semester: string;
  subjectId: string;
  items: Array<{ id?: string; nomorTp: number; judul: string; deskripsi?: string }>;
}) {
  const results = [];

  for (const item of data.items) {
    if (item.id) {
      // Update existing
      await db.update(schema.raporTp)
        .set({
          nomorTp: item.nomorTp,
          judul: item.judul,
          deskripsi: item.deskripsi || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.raporTp.id, item.id));
      results.push({ ...item, updated: true });
    } else {
      // Insert new
      const [result] = await db.insert(schema.raporTp)
        .values({
          academicYearId: data.academicYearId,
          semester: data.semester,
          subjectId: data.subjectId,
          nomorTp: item.nomorTp,
          judul: item.judul,
          deskripsi: item.deskripsi || null,
        })
        .returning();
      results.push(result);
    }
  }

  return results;
}

export async function deleteTujuanPembelajaran(id: string) {
  await db.delete(schema.raporTp).where(eq(schema.raporTp.id, id));
}

// ── Nilai ──────────────────────────────────────────────────────

export async function getNilai(params: {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
}) {
  // Get students in the class
  const students = await db.select({
    id: schema.studentProfiles.id,
    fullName: schema.studentProfiles.fullName,
    nisn: schema.studentProfiles.nisn,
    nis: schema.studentProfiles.nis,
    className: schema.studentProfiles.className,
  })
    .from(schema.studentProfiles)
    .where(and(
      eq(schema.studentProfiles.classId, params.classId),
      eq(schema.studentProfiles.status, 'active'),
    ))
    .orderBy(asc(schema.studentProfiles.fullName));

  // Get existing grades
  const grades = await db.select().from(schema.raporNilai)
    .where(and(
      eq(schema.raporNilai.academicYearId, params.academicYearId),
      eq(schema.raporNilai.semester, params.semester),
      eq(schema.raporNilai.classId, params.classId),
      eq(schema.raporNilai.subjectId, params.subjectId),
    ));

  // Get TP definitions
  const tpList = await getTujuanPembelajaran(params.academicYearId, params.semester, params.subjectId);

  // Get config
  const config = await getConfig(params.academicYearId, params.semester, params.classId, params.subjectId);

  // Merge: for each student, attach their grade data if exists
  const gradeMap = new Map(grades.map(g => [g.studentId, g]));

  const merged = students.map((s, idx) => {
    const grade = gradeMap.get(s.id);
    return {
      no: idx + 1,
      studentId: s.id,
      fullName: s.fullName || 'Tanpa Nama',
      nisn: s.nisn,
      nis: s.nis,
      className: s.className,
      // Grade data
      gradeId: grade?.id || null,
      nilaiTp: (grade?.nilaiTp as Record<string, number>) || {},
      nilaiSas: grade?.nilaiSas ?? null,
      rerataTp: grade?.rerataTp || null,
      nilaiAkhir: grade?.nilaiAkhir || null,
      predikat: grade?.predikat || null,
      catatanFormatif: grade?.catatanFormatif || null,
      deskripsiCapaian: grade?.deskripsiCapaian || null,
      isLocked: grade?.isLocked || false,
    };
  });

  return {
    students: merged,
    tpList,
    config: {
      bobotTp: (config as any).bobotTp ?? 60,
      bobotSas: (config as any).bobotSas ?? 40,
      kktp: (config as any).kktp ?? 75,
    },
  };
}

export async function saveNilai(params: {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
  guruId?: string;
  bobotTp: number;
  bobotSas: number;
  kktp: number;
  rows: Array<{
    studentId: string;
    gradeId?: string | null;
    nilaiTp: Record<string, number>;
    nilaiSas: number | null;
    catatanFormatif?: string | null;
    deskripsiCapaian?: string | null;
  }>;
}) {
  const results = [];

  // Get TP definitions for description generation
  const tpList = await getTujuanPembelajaran(params.academicYearId, params.semester, params.subjectId);
  const tpMap = new Map(tpList.map(tp => [String(tp.nomorTp), tp.judul]));

  for (const row of params.rows) {
    // Calculate rerata TP
    const tpValues = Object.values(row.nilaiTp).filter(v => v !== null && v !== undefined && !isNaN(v));
    const rerataTp = tpValues.length > 0 ? (tpValues.reduce((a, b) => a + b, 0) / tpValues.length) : 0;

    // Calculate NA
    const nilaiAkhir = row.nilaiSas !== null
      ? (rerataTp * (params.bobotTp / 100)) + ((row.nilaiSas || 0) * (params.bobotSas / 100))
      : rerataTp;

    // Determine predikat
    let predikat = 'Perlu Bimbingan';
    if (nilaiAkhir >= 90) predikat = 'Sangat Baik';
    else if (nilaiAkhir >= 80) predikat = 'Baik';
    else if (nilaiAkhir >= params.kktp) predikat = 'Cukup';

    // Auto-generate description if not manually set
    let deskripsi = row.deskripsiCapaian;
    if (!deskripsi && tpValues.length > 0) {
      deskripsi = generateDescription(row.nilaiTp, tpMap, params.kktp);
    }

    const gradeData = {
      academicYearId: params.academicYearId,
      semester: params.semester,
      classId: params.classId,
      subjectId: params.subjectId,
      studentId: row.studentId,
      guruId: params.guruId || null,
      nilaiTp: row.nilaiTp,
      nilaiSas: row.nilaiSas,
      rerataTp: rerataTp.toFixed(1),
      nilaiAkhir: nilaiAkhir.toFixed(1),
      predikat,
      catatanFormatif: row.catatanFormatif || null,
      deskripsiCapaian: deskripsi || null,
      updatedAt: new Date(),
    };

    if (row.gradeId) {
      // Update existing
      await db.update(schema.raporNilai)
        .set(gradeData)
        .where(eq(schema.raporNilai.id, row.gradeId));
      results.push({ ...gradeData, id: row.gradeId });
    } else {
      // Insert new
      const [result] = await db.insert(schema.raporNilai)
        .values(gradeData as any)
        .returning();
      results.push(result);
    }
  }

  return results;
}

export async function lockNilai(params: {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
}) {
  await db.update(schema.raporNilai)
    .set({ isLocked: true, updatedAt: new Date() })
    .where(and(
      eq(schema.raporNilai.academicYearId, params.academicYearId),
      eq(schema.raporNilai.semester, params.semester),
      eq(schema.raporNilai.classId, params.classId),
      eq(schema.raporNilai.subjectId, params.subjectId),
    ));
}

export async function generateDescriptions(params: {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
  kktp: number;
}) {
  // Get TP definitions
  const tpList = await getTujuanPembelajaran(params.academicYearId, params.semester, params.subjectId);
  const tpMap = new Map(tpList.map(tp => [String(tp.nomorTp), tp.judul]));

  // Get all grades
  const grades = await db.select().from(schema.raporNilai)
    .where(and(
      eq(schema.raporNilai.academicYearId, params.academicYearId),
      eq(schema.raporNilai.semester, params.semester),
      eq(schema.raporNilai.classId, params.classId),
      eq(schema.raporNilai.subjectId, params.subjectId),
    ));

  let updatedCount = 0;
  for (const grade of grades) {
    const nilaiTp = (grade.nilaiTp as Record<string, number>) || {};
    const desc = generateDescription(nilaiTp, tpMap, params.kktp);
    if (desc) {
      await db.update(schema.raporNilai)
        .set({ deskripsiCapaian: desc, updatedAt: new Date() })
        .where(eq(schema.raporNilai.id, grade.id));
      updatedCount++;
    }
  }

  return { updatedCount };
}

// ── Helper: Generate Description ───────────────────────────────

function generateDescription(nilaiTp: Record<string, number>, tpMap: Map<string, string>, kktp: number): string {
  const entries = Object.entries(nilaiTp)
    .filter(([_, v]) => v !== null && v !== undefined && !isNaN(v))
    .map(([key, score]) => ({
      key,
      score: Number(score),
      title: tpMap.get(key) || `Tujuan Pembelajaran ${key}`,
    }));

  if (entries.length === 0) return '';

  entries.sort((a, b) => b.score - a.score);
  const maxTp = entries[0];
  const minTp = entries[entries.length - 1];

  if (minTp.score >= kktp) {
    return `Menunjukkan penguasaan yang sangat baik dalam ${maxTp.title}, serta capaian kompetensi ${minTp.title} telah tuntas mencapai kriteria ketercapaian dengan optimal.`;
  } else {
    return `Menunjukkan penguasaan yang baik dalam ${maxTp.title}; namun masih memerlukan bimbingan terarah dan tindak lanjut remedial dalam ${minTp.title}.`;
  }
}

// ── Export CSV ──────────────────────────────────────────────────

export async function exportCsv(params: {
  academicYearId: string;
  semester: string;
  classId: string;
  subjectId: string;
}) {
  const data = await getNilai(params);
  const tpHeaders = data.tpList.map(tp => `TP ${tp.nomorTp}`);

  let csv = `No,NISN,NIS,Nama Santri,${tpHeaders.join(',')},Rerata TP,SAS,NA Rapor,Predikat,Deskripsi\n`;

  data.students.forEach((s, idx) => {
    const tpVals = data.tpList.map(tp => (s.nilaiTp as any)?.[String(tp.nomorTp)] ?? '');
    const sanitizedDesc = `"${(s.deskripsiCapaian || '').replace(/"/g, '""')}"`;
    csv += `${idx + 1},${s.nisn || ''},${s.nis || ''},"${s.fullName}",${tpVals.join(',')},${s.rerataTp || ''},${s.nilaiSas ?? ''},${s.nilaiAkhir || ''},${s.predikat || ''},${sanitizedDesc}\n`;
  });

  return csv;
}
