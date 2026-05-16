import { db } from "../../db";
import {
  kbmSubjects, distribusiJam, tugasTambahanMaster, tugasTambahan,
  ruangan, employees, classes, academicYears, jurnalMapelCodes,
} from "../../db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

const JTM_LIMIT = 40; // Default batas maksimal JTM per guru per semester

export class KbmService {

  // ═══ Subjects (Mapel) ═══════════════════════════════════════

  static async getSubjects(activeOnly = false) {
    if (activeOnly) {
      return db.select().from(kbmSubjects).where(eq(kbmSubjects.isActive, true)).orderBy(kbmSubjects.kode);
    }
    return db.select().from(kbmSubjects).orderBy(kbmSubjects.kode);
  }

  static async createSubject(data: { kode: string; nama: string }) {
    const results = await db.insert(kbmSubjects).values(data).returning();
    return results[0];
  }

  static async updateSubject(id: string, data: { kode?: string; nama?: string; isActive?: boolean }) {
    const results = await db.update(kbmSubjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kbmSubjects.id, id)).returning();
    return results[0] || null;
  }

  static async deleteSubject(id: string) {
    const results = await db.update(kbmSubjects)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(kbmSubjects.id, id)).returning();
    return results[0] || null;
  }

  static async seedDefaultSubjects() {
    // Copy from jurnal_mapel_codes if kbm_subjects is empty
    const existing = await db.select().from(kbmSubjects);
    if (existing.length > 0) return { seeded: 0, message: "Sudah ada data mapel" };

    const mapelCodes = await db.select().from(jurnalMapelCodes).orderBy(jurnalMapelCodes.kode);
    if (mapelCodes.length === 0) {
      // Fallback: seed from hardcoded list
      const defaults = [
        { kode: 'A', nama: 'Al-Quran Hadits' }, { kode: 'B', nama: 'Fikih' },
        { kode: 'C', nama: 'Akidah Akhlak' }, { kode: 'D', nama: 'SKI' },
        { kode: 'E', nama: 'Bahasa Arab' }, { kode: 'F', nama: 'Pendidikan Pancasila' },
        { kode: 'G', nama: 'Bahasa Indonesia' }, { kode: 'H', nama: 'Bahasa Inggris' },
        { kode: 'I', nama: 'Matematika' }, { kode: 'J', nama: 'Sejarah' },
        { kode: 'K', nama: 'Penjaskes' }, { kode: 'L', nama: 'Seni Budaya' },
        { kode: 'M', nama: 'Prakarya dan Kewirausahaan' }, { kode: 'N', nama: 'Ilmu Tafsir' },
        { kode: 'O', nama: 'Ilmu Hadits' }, { kode: 'P', nama: 'Ushul Fikih' },
        { kode: 'Q', nama: 'Ekonomi' }, { kode: 'R', nama: 'Geografi' },
        { kode: 'S', nama: 'Sosiologi' }, { kode: 'T', nama: 'Fisika' },
        { kode: 'U', nama: 'Kimia' }, { kode: 'V', nama: 'Biologi' },
        { kode: 'W', nama: 'Informatika' }, { kode: 'X', nama: 'Bimbingan Konseling' },
        { kode: 'Y', nama: 'Tahfidz' }, { kode: 'Z', nama: 'Mulok' },
      ];
      await db.insert(kbmSubjects).values(defaults).onConflictDoNothing({ target: kbmSubjects.kode });
      return { seeded: defaults.length, message: "Seed dari data default" };
    }

    const values = mapelCodes.map(mc => ({ kode: mc.kode, nama: mc.subjectName }));
    await db.insert(kbmSubjects).values(values).onConflictDoNothing({ target: kbmSubjects.kode });
    return { seeded: values.length, message: "Seed dari jurnal_mapel_codes" };
  }

  // ═══ Distribusi Jam ═════════════════════════════════════════

  static async getDistribusi(academicYearId: string, semester: string) {
    return db.select({
      id: distribusiJam.id,
      academicYearId: distribusiJam.academicYearId,
      semester: distribusiJam.semester,
      guruId: distribusiJam.guruId,
      guruName: employees.name,
      guruNip: employees.nip,
      guruGrade: employees.grade,
      kelasId: distribusiJam.kelasId,
      kelasName: classes.name,
      subjectId: distribusiJam.subjectId,
      subjectKode: kbmSubjects.kode,
      subjectNama: kbmSubjects.nama,
      jumlahJam: distribusiJam.jumlahJam,
    })
    .from(distribusiJam)
    .leftJoin(employees, eq(distribusiJam.guruId, employees.id))
    .leftJoin(classes, eq(distribusiJam.kelasId, classes.id))
    .leftJoin(kbmSubjects, eq(distribusiJam.subjectId, kbmSubjects.id))
    .where(and(
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
    ))
    .orderBy(employees.name, kbmSubjects.kode, classes.name);
  }

  static async upsertDistribusi(data: {
    academicYearId: string; semester: string;
    guruId: string; kelasId: string; subjectId: string; jumlahJam: number;
  }) {
    // Check if record exists
    const existing = await db.select().from(distribusiJam).where(and(
      eq(distribusiJam.academicYearId, data.academicYearId),
      eq(distribusiJam.semester, data.semester),
      eq(distribusiJam.guruId, data.guruId),
      eq(distribusiJam.kelasId, data.kelasId),
      eq(distribusiJam.subjectId, data.subjectId),
    ));

    if (existing.length > 0) {
      if (data.jumlahJam === 0) {
        // Delete if 0
        await db.delete(distribusiJam).where(eq(distribusiJam.id, existing[0].id));
        return { action: 'deleted', id: existing[0].id };
      }
      const results = await db.update(distribusiJam)
        .set({ jumlahJam: data.jumlahJam, updatedAt: new Date() })
        .where(eq(distribusiJam.id, existing[0].id)).returning();
      return { action: 'updated', ...results[0] };
    }

    if (data.jumlahJam === 0) return { action: 'skipped' };

    const results = await db.insert(distribusiJam).values(data).returning();
    return { action: 'created', ...results[0] };
  }

  static async bulkUpsertDistribusi(records: Array<{
    academicYearId: string; semester: string;
    guruId: string; kelasId: string; subjectId: string; jumlahJam: number;
  }>) {
    const results = [];
    for (const record of records) {
      const result = await this.upsertDistribusi(record);
      results.push(result);
    }
    return results;
  }

  static async deleteDistribusi(id: string) {
    const results = await db.delete(distribusiJam).where(eq(distribusiJam.id, id)).returning();
    return results[0] || null;
  }

  // ═══ JTM Summary ═══════════════════════════════════════════

  static async getJtmSummary(academicYearId: string, semester: string) {
    // Get all guru with their teaching hours
    const guruList = await db.select({
      id: employees.id,
      name: employees.name,
      nip: employees.nip,
      grade: employees.grade,
      type: employees.type,
    }).from(employees).where(eq(employees.type, 'Guru')).orderBy(employees.name);

    // Get sum of jam mengajar per guru
    const jamRows = await db.select({
      guruId: distribusiJam.guruId,
      totalJam: sql<number>`COALESCE(SUM(${distribusiJam.jumlahJam}), 0)`.as('total_jam'),
    })
    .from(distribusiJam)
    .where(and(
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
    ))
    .groupBy(distribusiJam.guruId);

    const jamMap = new Map(jamRows.map(r => [r.guruId, Number(r.totalJam)]));

    // Get sum of tugas tambahan per guru
    const tugasRows = await db.select({
      guruId: tugasTambahan.guruId,
      totalTugas: sql<number>`COALESCE(SUM(${tugasTambahan.setaraJam}), 0)`.as('total_tugas'),
    })
    .from(tugasTambahan)
    .where(and(
      eq(tugasTambahan.academicYearId, academicYearId),
      eq(tugasTambahan.semester, semester),
    ))
    .groupBy(tugasTambahan.guruId);

    const tugasMap = new Map(tugasRows.map(r => [r.guruId, Number(r.totalTugas)]));

    return guruList.map(guru => {
      const jamMengajar = jamMap.get(guru.id) || 0;
      const setaraTugas = tugasMap.get(guru.id) || 0;
      const totalJtm = jamMengajar + setaraTugas;
      return {
        ...guru,
        jamMengajar,
        setaraTugas,
        totalJtm,
        status: totalJtm > JTM_LIMIT ? 'overload' : totalJtm > 24 ? 'tinggi' : 'normal',
      };
    }).sort((a, b) => b.totalJtm - a.totalJtm);
  }

  // ═══ Tugas Tambahan Master ══════════════════════════════════

  static async getTugasMaster() {
    return db.select().from(tugasTambahanMaster).orderBy(tugasTambahanMaster.kategori, tugasTambahanMaster.namaTugas);
  }

  static async createTugasMaster(data: { namaTugas: string; kategori: string; defaultSetaraJam: number }) {
    const results = await db.insert(tugasTambahanMaster).values(data).returning();
    return results[0];
  }

  static async updateTugasMaster(id: string, data: any) {
    const results = await db.update(tugasTambahanMaster)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tugasTambahanMaster.id, id)).returning();
    return results[0] || null;
  }

  static async deleteTugasMaster(id: string) {
    const results = await db.delete(tugasTambahanMaster).where(eq(tugasTambahanMaster.id, id)).returning();
    return results[0] || null;
  }

  static async seedDefaultTugasMaster() {
    const existing = await db.select().from(tugasTambahanMaster);
    if (existing.length > 0) return { seeded: 0, message: "Sudah ada data tugas" };

    const defaults = [
      // Struktural
      { namaTugas: 'Kepala Madrasah', kategori: 'struktural', defaultSetaraJam: 18 },
      { namaTugas: 'Waka Kurikulum', kategori: 'struktural', defaultSetaraJam: 12 },
      { namaTugas: 'Waka Kesiswaan', kategori: 'struktural', defaultSetaraJam: 12 },
      { namaTugas: 'Waka Humas', kategori: 'struktural', defaultSetaraJam: 12 },
      { namaTugas: 'Waka Sarpras', kategori: 'struktural', defaultSetaraJam: 12 },
      // Kurikulum
      { namaTugas: 'Kepala Lab IPA', kategori: 'kurikulum', defaultSetaraJam: 12 },
      { namaTugas: 'Kepala Lab Agama', kategori: 'kurikulum', defaultSetaraJam: 12 },
      { namaTugas: 'Kepala Lab Bahasa', kategori: 'kurikulum', defaultSetaraJam: 12 },
      { namaTugas: 'Kepala Lab Komputer', kategori: 'kurikulum', defaultSetaraJam: 12 },
      { namaTugas: 'Wali Kelas', kategori: 'kurikulum', defaultSetaraJam: 6 },
      { namaTugas: 'Guru Piket', kategori: 'kurikulum', defaultSetaraJam: 1 },
      { namaTugas: 'Koordinator Projek', kategori: 'kurikulum', defaultSetaraJam: 2 },
      // Kesiswaan
      { namaTugas: 'Pembina Pramuka', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Biologi', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Ekonomi', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina UKS/PMR', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Matematika', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Arabic', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Imtaq', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Paskibra', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Olahraga', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Sanggar Seni', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club English', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Kimia', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Fisika', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina OSIM', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Pencak Silat', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Club Geografi', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Jurnalistik', kategori: 'kesiswaan', defaultSetaraJam: 2 },
      { namaTugas: 'Pembina Kaligrafi', kategori: 'kesiswaan', defaultSetaraJam: 2 },
    ];

    await db.insert(tugasTambahanMaster).values(defaults);
    return { seeded: defaults.length, message: "Seed data tugas tambahan berhasil" };
  }

  // ═══ Tugas Tambahan (Assignment) ════════════════════════════

  static async getTugas(academicYearId: string, semester: string, guruId?: string) {
    let query = db.select({
      id: tugasTambahan.id,
      academicYearId: tugasTambahan.academicYearId,
      semester: tugasTambahan.semester,
      guruId: tugasTambahan.guruId,
      guruName: employees.name,
      guruNip: employees.nip,
      masterId: tugasTambahan.masterId,
      namaTugas: tugasTambahanMaster.namaTugas,
      kategori: tugasTambahanMaster.kategori,
      keterangan: tugasTambahan.keterangan,
      setaraJam: tugasTambahan.setaraJam,
    })
    .from(tugasTambahan)
    .leftJoin(employees, eq(tugasTambahan.guruId, employees.id))
    .leftJoin(tugasTambahanMaster, eq(tugasTambahan.masterId, tugasTambahanMaster.id))
    .where(and(
      eq(tugasTambahan.academicYearId, academicYearId),
      eq(tugasTambahan.semester, semester),
      ...(guruId ? [eq(tugasTambahan.guruId, guruId)] : []),
    ))
    .orderBy(tugasTambahanMaster.kategori, employees.name);

    return query;
  }

  static async createTugas(data: {
    academicYearId: string; semester: string; guruId: string;
    masterId: string; keterangan?: string; setaraJam: number;
  }) {
    const results = await db.insert(tugasTambahan).values(data).returning();
    return results[0];
  }

  static async updateTugas(id: string, data: { keterangan?: string; setaraJam?: number }) {
    const results = await db.update(tugasTambahan)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tugasTambahan.id, id)).returning();
    return results[0] || null;
  }

  static async deleteTugas(id: string) {
    const results = await db.delete(tugasTambahan).where(eq(tugasTambahan.id, id)).returning();
    return results[0] || null;
  }

  // ═══ Ruangan ════════════════════════════════════════════════

  static async getRuangan() {
    return db.select().from(ruangan).orderBy(ruangan.nama);
  }

  static async createRuangan(data: { nama: string; tipe?: string; kapasitas?: number }) {
    const results = await db.insert(ruangan).values(data).returning();
    return results[0];
  }

  static async updateRuangan(id: string, data: any) {
    const results = await db.update(ruangan)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ruangan.id, id)).returning();
    return results[0] || null;
  }

  static async deleteRuangan(id: string) {
    const results = await db.delete(ruangan).where(eq(ruangan.id, id)).returning();
    return results[0] || null;
  }

  static async seedRuanganFromClasses() {
    const classList = await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(classes.name);
    if (classList.length === 0) return { seeded: 0, message: "Tidak ada data kelas" };

    const existingRooms = await db.select({ nama: ruangan.nama }).from(ruangan);
    const existingNames = new Set(existingRooms.map(r => r.nama));

    const newRooms: { nama: string; tipe: string; kapasitas: number }[] = [];
    for (const cls of classList) {
      const roomName = `Ruang ${cls.name}`;
      if (!existingNames.has(roomName)) {
        newRooms.push({ nama: roomName, tipe: 'reguler', kapasitas: 40 });
        existingNames.add(roomName);
      }
    }

    if (newRooms.length === 0) return { seeded: 0, message: "Semua kelas sudah ada di ruangan" };

    await db.insert(ruangan).values(newRooms);
    return { seeded: newRooms.length, message: `${newRooms.length} ruangan ditambahkan dari data kelas` };
  }

  // ═══ Template & Import ══════════════════════════════════════

  static async getTemplateData(academicYearId: string, semester: string) {
    const distribusi = await this.getDistribusi(academicYearId, semester);
    const classList = await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(classes.name);
    const guruList = await db.select({ id: employees.id, name: employees.name, nip: employees.nip })
      .from(employees).where(eq(employees.type, 'Guru')).orderBy(employees.name);
    const subjectList = await db.select({ id: kbmSubjects.id, kode: kbmSubjects.kode, nama: kbmSubjects.nama })
      .from(kbmSubjects).where(eq(kbmSubjects.isActive, true)).orderBy(kbmSubjects.kode);

    // Build rows grouped by guru+mapel with cells per class
    const rowMap = new Map<string, { guruNip: string; guruName: string; subjectKode: string; subjectNama: string; cells: Record<string, number> }>();
    for (const d of distribusi) {
      const key = `${d.guruId}::${d.subjectId}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          guruNip: d.guruNip || '', guruName: d.guruName || '',
          subjectKode: d.subjectKode || '', subjectNama: d.subjectNama || '',
          cells: {},
        });
      }
      rowMap.get(key)!.cells[d.kelasName || ''] = d.jumlahJam;
    }

    return {
      classList,
      guruList,
      subjectList,
      rows: Array.from(rowMap.values()),
    };
  }

  static async getImportLookups() {
    const guruList = await db.select({ id: employees.id, name: employees.name, nip: employees.nip })
      .from(employees).where(eq(employees.type, 'Guru'));
    const subjectList = await db.select({ id: kbmSubjects.id, kode: kbmSubjects.kode, nama: kbmSubjects.nama })
      .from(kbmSubjects).where(eq(kbmSubjects.isActive, true));
    const classList = await db.select({ id: classes.id, name: classes.name }).from(classes);
    return { guruList, subjectList, classList };
  }

  // ═══ Dashboard ══════════════════════════════════════════════

  static async getDashboardStats(academicYearId: string, semester: string) {
    const [guruCount] = await db.select({ count: sql<number>`count(*)` })
      .from(employees).where(eq(employees.type, 'Guru'));
    const [kelasCount] = await db.select({ count: sql<number>`count(*)` })
      .from(classes);
    const [jamTotal] = await db.select({
      total: sql<number>`COALESCE(SUM(${distribusiJam.jumlahJam}), 0)`,
    }).from(distribusiJam).where(and(
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
    ));
    const [tugasTotal] = await db.select({
      total: sql<number>`COALESCE(SUM(${tugasTambahan.setaraJam}), 0)`,
    }).from(tugasTambahan).where(and(
      eq(tugasTambahan.academicYearId, academicYearId),
      eq(tugasTambahan.semester, semester),
    ));

    // Get active academic year
    const activeAY = await db.select().from(academicYears).where(eq(academicYears.isActive, true));

    return {
      totalGuru: Number(guruCount.count),
      totalKelas: Number(kelasCount.count),
      totalJamMengajar: Number(jamTotal.total),
      totalSetaraTugas: Number(tugasTotal.total),
      activeAcademicYear: activeAY[0] || null,
    };
  }

  // ═══ Copy Semester ══════════════════════════════════════════

  static async copySemester(
    sourceAYId: string, sourceSem: string,
    targetAYId: string, targetSem: string
  ) {
    // Copy distribusi jam
    const sourceDistribusi = await db.select().from(distribusiJam).where(and(
      eq(distribusiJam.academicYearId, sourceAYId),
      eq(distribusiJam.semester, sourceSem),
    ));

    let copiedDistribusi = 0;
    for (const d of sourceDistribusi) {
      await db.insert(distribusiJam).values({
        academicYearId: targetAYId,
        semester: targetSem,
        guruId: d.guruId,
        kelasId: d.kelasId,
        subjectId: d.subjectId,
        jumlahJam: d.jumlahJam,
      }).onConflictDoNothing();
      copiedDistribusi++;
    }

    // Copy tugas tambahan
    const sourceTugas = await db.select().from(tugasTambahan).where(and(
      eq(tugasTambahan.academicYearId, sourceAYId),
      eq(tugasTambahan.semester, sourceSem),
    ));

    let copiedTugas = 0;
    for (const t of sourceTugas) {
      await db.insert(tugasTambahan).values({
        academicYearId: targetAYId,
        semester: targetSem,
        guruId: t.guruId,
        masterId: t.masterId,
        keterangan: t.keterangan,
        setaraJam: t.setaraJam,
      });
      copiedTugas++;
    }

    return { copiedDistribusi, copiedTugas };
  }

  // ═══ Export Excel ═══════════════════════════════════════════

  static async getExportDistribusiData(academicYearId: string, semester: string) {
    const distribusi = await this.getDistribusi(academicYearId, semester);
    const classList = await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(classes.name);
    const jtmSummary = await this.getJtmSummary(academicYearId, semester);
    return { distribusi, classList, jtmSummary };
  }

  static async getExportTugasData(academicYearId: string, semester: string) {
    const tugas = await this.getTugas(academicYearId, semester);
    return { tugas };
  }
}
