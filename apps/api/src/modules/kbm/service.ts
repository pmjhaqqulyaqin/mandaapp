import { db } from "../../db";
import {
  kbmSubjects, distribusiJam, tugasTambahanMaster, tugasTambahan,
  ruangan, employees, classes, academicYears, jurnalMapelCodes,
  kbmJadwal, teachingSubjects, guruUnavailability, scheduleConfig,
  jadwalVersion,
} from "../../db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";

const JTM_LIMIT = 40; // Default batas maksimal JTM per guru per semester

export class KbmService {

  // â•â•â• Subjects (Mapel) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  static async updateSubject(id: string, data: { kode?: string; nama?: string; isActive?: boolean; maxJamKe?: number | null; allowSingleSplit?: boolean; isHeavy?: boolean; customSplitRule?: any }) {
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

  // â•â•â• Distribusi Jam â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  static async deleteAllDistribusi(academicYearId: string, semester: string) {
    const results = await db.delete(distribusiJam).where(and(
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
    )).returning();
    return results.length;
  }

  // â•â•â• JTM Summary â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â• Tugas Tambahan Master â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â• Tugas Tambahan (Assignment) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  static async deleteAllTugas(academicYearId: string, semester: string) {
    const results = await db.delete(tugasTambahan).where(and(
      eq(tugasTambahan.academicYearId, academicYearId),
      eq(tugasTambahan.semester, semester),
    )).returning();
    return results.length;
  }

  // â•â•â• Ruangan â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â• Template & Import â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  static async getTemplateTugasData(academicYearId: string, semester: string) {
    const tugas = await this.getTugas(academicYearId, semester);
    const guruList = await db.select({ id: employees.id, name: employees.name, nip: employees.nip })
      .from(employees).where(eq(employees.type, 'Guru')).orderBy(employees.name);
    const masterList = await db.select().from(tugasTambahanMaster).orderBy(tugasTambahanMaster.kategori, tugasTambahanMaster.namaTugas);
    return { tugas, guruList, masterList };
  }

  static async getImportTugasLookups() {
    const guruList = await db.select({ id: employees.id, name: employees.name, nip: employees.nip })
      .from(employees).where(eq(employees.type, 'Guru'));
    const masterList = await db.select({ id: tugasTambahanMaster.id, namaTugas: tugasTambahanMaster.namaTugas, kategori: tugasTambahanMaster.kategori, defaultSetaraJam: tugasTambahanMaster.defaultSetaraJam })
      .from(tugasTambahanMaster);
    return { guruList, masterList };
  }

  // â•â•â• Jadwal (Phase 2 â€” Auto Scheduler) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Helper: safely get active version (graceful if jadwal_version table doesn't exist)
  private static async getActiveVersion(academicYearId: string, semester: string): Promise<{ id: string } | null> {
    try {
      const [v] = await db.select({ id: jadwalVersion.id }).from(jadwalVersion)
        .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester), eq(jadwalVersion.isAktif, true)))
        .limit(1);
      return v || null;
    } catch { return null; } // table may not exist yet
  }

  static async getJadwal(academicYearId: string, semester: string, filters?: { kelasId?: string; guruId?: string }) {
    const activeVersion = await this.getActiveVersion(academicYearId, semester);

    const conditions: any[] = [
      eq(kbmJadwal.academicYearId, academicYearId),
      eq(kbmJadwal.semester, semester),
    ];
    if (activeVersion) {
      conditions.push(eq(kbmJadwal.versionId, activeVersion.id));
    }
    // If no version system yet, show all slots (no filter)
    if (filters?.kelasId) conditions.push(eq(kbmJadwal.kelasId, filters.kelasId));
    if (filters?.guruId) conditions.push(eq(kbmJadwal.guruId, filters.guruId));

    return db.select({
      id: kbmJadwal.id,
      guruId: kbmJadwal.guruId,
      guruName: employees.name,
      kelasId: kbmJadwal.kelasId,
      kelasName: classes.name,
      subjectId: kbmJadwal.subjectId,
      subjectKode: kbmSubjects.kode,
      subjectNama: kbmSubjects.nama,
      ruanganId: kbmJadwal.ruanganId,
      ruanganNama: ruangan.nama,
      dayOfWeek: kbmJadwal.dayOfWeek,
      jamKe: kbmJadwal.jamKe,
    })
      .from(kbmJadwal)
      .leftJoin(employees, eq(kbmJadwal.guruId, employees.id))
      .leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
      .leftJoin(kbmSubjects, eq(kbmJadwal.subjectId, kbmSubjects.id))
      .leftJoin(ruangan, eq(kbmJadwal.ruanganId, ruangan.id))
      .where(and(...conditions))
      .orderBy(kbmJadwal.dayOfWeek, kbmJadwal.jamKe);
  }

  // â•â•â• Guru Unavailability â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  static async getGuruUnavailability(academicYearId: string, semester: string) {
    return db.select({
      id: guruUnavailability.id,
      guruId: guruUnavailability.guruId,
      guruName: employees.name,
      dayOfWeek: guruUnavailability.dayOfWeek,
      reason: guruUnavailability.reason,
    })
      .from(guruUnavailability)
      .leftJoin(employees, eq(guruUnavailability.guruId, employees.id))
      .where(and(
        eq(guruUnavailability.academicYearId, academicYearId),
        eq(guruUnavailability.semester, semester),
      ))
      .orderBy(employees.name, guruUnavailability.dayOfWeek);
  }

  static async createGuruUnavailability(data: {
    guruId: string; academicYearId: string; semester: string; dayOfWeek: number; reason?: string;
  }) {
    const results = await db.insert(guruUnavailability).values(data).returning();
    return results[0];
  }

  static async deleteGuruUnavailability(id: string) {
    const results = await db.delete(guruUnavailability).where(eq(guruUnavailability.id, id)).returning();
    return results[0] || null;
  }

  static async bulkSetGuruUnavailability(
    academicYearId: string, semester: string,
    entries: { guruId: string; dayOfWeek: number; reason?: string }[]
  ) {
    // Clear existing for this semester
    await db.delete(guruUnavailability).where(and(
      eq(guruUnavailability.academicYearId, academicYearId),
      eq(guruUnavailability.semester, semester),
    ));
    if (entries.length === 0) return { count: 0 };
    const values = entries.map(e => ({ ...e, academicYearId, semester }));
    await db.insert(guruUnavailability).values(values);
    return { count: entries.length };
  }

  // â•â•â• Schedule Config â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  static async getScheduleConfig(academicYearId: string, semester: string) {
    const [existing] = await db.select().from(scheduleConfig).where(and(
      eq(scheduleConfig.academicYearId, academicYearId),
      eq(scheduleConfig.semester, semester),
    ));
    if (existing) return existing;
    // Return defaults
    return {
      id: null,
      academicYearId, semester,
      maxDailyJpThreshold: 20,
      maxDailyJpLimit: 6,
      afternoonStartJam: 7,
      afternoonExcludeFriday: true,
      defaultSplitRules: { '2': [2], '3': [3], '4': [2, 2], '5': [3, 2], '6': [3, 3] },
    };
  }

  static async upsertScheduleConfig(academicYearId: string, semester: string, data: {
    maxDailyJpThreshold?: number; maxDailyJpLimit?: number;
    afternoonStartJam?: number; afternoonExcludeFriday?: boolean;
    defaultSplitRules?: any;
  }) {
    const [existing] = await db.select().from(scheduleConfig).where(and(
      eq(scheduleConfig.academicYearId, academicYearId),
      eq(scheduleConfig.semester, semester),
    ));
    if (existing) {
      const [updated] = await db.update(scheduleConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(scheduleConfig.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(scheduleConfig)
      .values({ academicYearId, semester, ...data }).returning();
    return created;
  }

  // â•â•â• Jadwal (Phase 2 â€” Multi-Pass Constraint Scheduler) â•â•â•â•â•


  // ═══ Jadwal (Phase 2 — Multi-Pass Constraint Scheduler) ═════

  static async generateJadwal(academicYearId: string, semester: string, clearExisting = true, onProgress?: (data: { phase: string; progress: number; detail?: string }) => void) {
    const emit = onProgress || (() => {});
    emit({ phase: 'init', progress: 0, detail: 'Mempersiapkan data...' });

    if (clearExisting) {
      const activeVer = await this.getActiveVersion(academicYearId, semester);
      if (activeVer) {
        await db.delete(kbmJadwal).where(and(eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester), eq(kbmJadwal.versionId, activeVer.id)));
        try { await db.update(jadwalVersion).set({ isAktif: false }).where(eq(jadwalVersion.id, activeVer.id)); } catch {}
      } else {
        // No version system yet — clear all slots for this semester
        await db.delete(kbmJadwal).where(and(eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester)));
      }
    }

    const distribusi = await db.select({ guruId: distribusiJam.guruId, kelasId: distribusiJam.kelasId, subjectId: distribusiJam.subjectId, jumlahJam: distribusiJam.jumlahJam })
      .from(distribusiJam).where(and(eq(distribusiJam.academicYearId, academicYearId), eq(distribusiJam.semester, semester)));
    if (distribusi.length === 0) return { generated: 0, failed: 0, total: 0, blocks: 0, failedBlocks: 0, message: 'Tidak ada distribusi jam', report: null };
    emit({ phase: 'init', progress: 5, detail: `${distribusi.length} distribusi dimuat` });

    const subjectList = await db.select().from(kbmSubjects).where(eq(kbmSubjects.isActive, true));
    const subjectMap = new Map(subjectList.map(s => [s.id, s]));
    const unavail = await db.select().from(guruUnavailability).where(and(eq(guruUnavailability.academicYearId, academicYearId), eq(guruUnavailability.semester, semester)));
    const guruUnavailDays = new Map<string, Set<number>>();
    for (const u of unavail) { if (!guruUnavailDays.has(u.guruId)) guruUnavailDays.set(u.guruId, new Set()); guruUnavailDays.get(u.guruId)!.add(u.dayOfWeek); }
    const config = await this.getScheduleConfig(academicYearId, semester);
    const splitRules: Record<string, number[]> = (config.defaultSplitRules as any) || { '2': [2], '3': [3], '4': [2, 2], '5': [3, 2], '6': [3, 3] };
    const timeSlots = await db.execute(sql`SELECT DISTINCT day_of_week, jam_ke FROM jurnal_time_slots WHERE is_active = true ORDER BY day_of_week, jam_ke`);
    const availableDays = new Map<number, number[]>();
    for (const ts of (timeSlots as any).rows || timeSlots) { const d = Number(ts.day_of_week), j = Number(ts.jam_ke); if (!availableDays.has(d)) availableDays.set(d, []); availableDays.get(d)!.push(j); }
    if (availableDays.size === 0) { for (let d = 1; d <= 6; d++) availableDays.set(d, [1, 2, 3, 4, 5, 6, 7, 8]); }
    const rooms = await db.select({ id: ruangan.id, nama: ruangan.nama }).from(ruangan).where(eq(ruangan.isActive, true));

    // Precompute day slot counts and parity
    const daySlotCount = new Map<number, number>();
    for (const [d, jams] of availableDays) daySlotCount.set(d, jams.length);

    const guruTotalJP = new Map<string, number>();
    for (const d of distribusi) guruTotalJP.set(d.guruId, (guruTotalJP.get(d.guruId) || 0) + d.jumlahJam);

    // Expand distribusi into blocks
    interface Block { guruId: string; kelasId: string; subjectId: string; size: number; isHeavy: boolean; maxJamKe: number | null; difficulty: number; failReason?: string; passPlaced?: number; }
    const buildBlocks = (forceAutoSplit = false): Block[] => {
      const result: Block[] = [];
      for (const d of distribusi) {
        const subject = subjectMap.get(d.subjectId);
        const isHeavy = subject?.isHeavy || false;
        const maxJamKe = subject?.maxJamKe || null;
        const allowSingle = subject?.allowSingleSplit || false;
        const customSplit = subject?.customSplitRule as Record<string, number[]> | null;
        const jp = d.jumlahJam;
        let blockSizes: number[];
        if (customSplit && customSplit[String(jp)]) { blockSizes = customSplit[String(jp)]; }
        else if (splitRules[String(jp)]) { blockSizes = [...splitRules[String(jp)]]; }
        else { blockSizes = []; let rem = jp; while (rem > 0) { if (rem >= 3 && rem !== 4) { blockSizes.push(3); rem -= 3; } else if (rem >= 2) { blockSizes.push(2); rem -= 2; } else { blockSizes.push(1); rem -= 1; } } }
        const shouldSplit = forceAutoSplit || allowSingle;
        if (shouldSplit && !customSplit) {
          if (jp === 3 && blockSizes.length === 1 && blockSizes[0] === 3) blockSizes = [2, 1];
          else if (jp === 5 && blockSizes.length === 2 && blockSizes[0] === 3 && blockSizes[1] === 2) blockSizes = [2, 2, 1];
        }
        const guruUnavailCount = guruUnavailDays.get(d.guruId)?.size || 0;
        for (const size of blockSizes) {
          const difficulty = size * 10 + (isHeavy ? 50 : 0) + (maxJamKe ? 30 : 0) + guruUnavailCount * 15 + (guruTotalJP.get(d.guruId)! > 20 ? 20 : 0);
          result.push({ guruId: d.guruId, kelasId: d.kelasId, subjectId: d.subjectId, size, isHeavy, maxJamKe, difficulty });
        }
      }
      return result;
    };

    const dayList = Array.from(availableDays.keys()).sort((a, b) => a - b);
    const slotKey = (day: number, jam: number) => `${day}-${jam}`;
    const ensureSet = (map: Map<string, Set<string>>, key: string) => { if (!map.has(key)) map.set(key, new Set()); return map.get(key)!; };
    const ensureMap = (map: Map<string, Map<number, number>>, key: string) => { if (!map.has(key)) map.set(key, new Map()); return map.get(key)!; };
    const PASS_LABELS = ['Strict (semua constraint)', 'Relax distribusi merata', 'Relax afternoon + daily limit', 'Relax heavy separation', 'Force (hard constraint only)'];

    // --- Core placement function with scoring ---
    const runAttempt = (blocks: Block[]): { placed: any[]; failed: Block[]; passResults: { pass: number; label: string; placed: number }[] } => {
      const guruSlots = new Map<string, Set<string>>();
      const kelasSlots = new Map<string, Set<string>>();
      const roomSlots = new Map<string, Set<string>>();
      const guruDayJP = new Map<string, Map<number, number>>();
      const kelasHeavyDays = new Map<string, Set<number>>();
      const kelasDayJP = new Map<string, Map<number, number>>();
      // Track guru-kelas-day blocks for adjacency check
      const guruKelasDay = new Map<string, { startJam: number; endJam: number }[]>();
      const placed: any[] = [];
      const passResults: { pass: number; label: string; placed: number }[] = [];

      const tryPlace = (block: Block, passLevel: number): { day: number; startJam: number } | null => {
        const threshold = config.maxDailyJpThreshold || 20;
        const maxDailyLimit = config.maxDailyJpLimit || 6;
        const totalJP = guruTotalJP.get(block.guruId) || 0;
        let best: { day: number; startJam: number; score: number } | null = null;

        for (const day of dayList) {
          if (guruUnavailDays.get(block.guruId)?.has(day)) continue;
          if (passLevel < 4 && block.isHeavy && kelasHeavyDays.get(block.kelasId)?.has(day)) continue;
          if (passLevel < 3 && totalJP > threshold) {
            const curJP = ensureMap(guruDayJP, block.guruId).get(day) || 0;
            if (curJP + block.size > maxDailyLimit) continue;
          }
          const afternoonApplies = block.maxJamKe && !(config.afternoonExcludeFriday && day === 5);
          // Heavy subjects: maxJamKe is a HARD constraint (never relaxed).  Non-heavy: relaxed at pass 3+
          const enforceAfternoon = afternoonApplies && (block.isHeavy ? true : passLevel < 3);
          const activeDays = dayList.filter(d => !guruUnavailDays.get(block.guruId)?.has(d)).length;
          const targetPerDay = activeDays > 0 ? Math.ceil(totalJP / activeDays) : 99;
          const currentGuruDayJP = ensureMap(guruDayJP, block.guruId).get(day) || 0;
          const isOverloaded = passLevel < 2 && currentGuruDayJP >= Math.ceil(targetPerDay * 1.5);
          const daySlots = daySlotCount.get(day) || 8;
          const dayIsEven = daySlots % 2 === 0;

          const jams = availableDays.get(day)!;
          for (let si = 0; si <= jams.length - block.size; si++) {
            let consecutive = true;
            for (let o = 1; o < block.size; o++) { if (jams[si + o] !== jams[si] + o) { consecutive = false; break; } }
            if (!consecutive) continue;
            const startJam = jams[si], endJam = startJam + block.size - 1;
            if (enforceAfternoon && endJam > block.maxJamKe!) continue;
            let allFree = true;
            for (let j = startJam; j <= endJam; j++) {
              const sk = slotKey(day, j);
              if (ensureSet(guruSlots, block.guruId).has(sk) || ensureSet(kelasSlots, block.kelasId).has(sk)) { allFree = false; break; }
            }
            if (!allFree) continue;

            // === SCORING ===
            let score = 100;
            // S1: Prefer morning for heavy subjects
            if (block.isHeavy) score += (10 - startJam) * 3;
            // S2: Spread guru across days
            score -= currentGuruDayJP * 8;
            // S3: Spread kelas across days
            score -= (ensureMap(kelasDayJP, block.kelasId).get(day) || 0) * 2;
            // S4: Penalize overloaded days
            if (isOverloaded) score -= 50;
            // S5: Avoid heavy clash days
            if (kelasHeavyDays.get(block.kelasId)?.has(day)) score -= 20;
            // S6: DAY PARITY — penalize odd block on even day, prefer even blocks on even days
            if (dayIsEven && block.size % 2 !== 0) score -= 15;
            if (!dayIsEven && block.size === 3) score += 5; // prefer 3-blocks on odd days
            // S7: GURU-KELAS ADJACENCY — penalize if guru already has adjacent block in same class on this day
            const gkKey = `${block.guruId}-${block.kelasId}-${day}`;
            const existingBlocks = guruKelasDay.get(gkKey) || [];
            for (const eb of existingBlocks) {
              if (startJam === eb.endJam + 1 || endJam === eb.startJam - 1) {
                score -= 40; // heavily penalize back-to-back same guru same class
                break;
              }
            }
            if (!best || score > best.score) best = { day, startJam, score };
          }
        }
        return best;
      };

      // Multi-pass
      let remaining = [...blocks];
      for (let pass = 1; pass <= 5; pass++) {
        if (remaining.length === 0) break;
        const nextRemaining: Block[] = [];
        let placedThisPass = 0;
        for (const block of remaining) {
          const result = tryPlace(block, pass);
          if (!result) { nextRemaining.push(block); continue; }
          const { day, startJam } = result;
          for (let j = startJam; j < startJam + block.size; j++) {
            const sk = slotKey(day, j);
            ensureSet(guruSlots, block.guruId).add(sk);
            ensureSet(kelasSlots, block.kelasId).add(sk);
            let assignedRoom: string | null = null;
            for (const room of rooms) { if (!ensureSet(roomSlots, room.id).has(sk)) { assignedRoom = room.id; roomSlots.get(room.id)!.add(sk); break; } }
            placed.push({ academicYearId, semester, guruId: block.guruId, kelasId: block.kelasId, subjectId: block.subjectId, ruanganId: assignedRoom, dayOfWeek: day, jamKe: j });
          }
          ensureMap(guruDayJP, block.guruId).set(day, (ensureMap(guruDayJP, block.guruId).get(day) || 0) + block.size);
          ensureMap(kelasDayJP, block.kelasId).set(day, (ensureMap(kelasDayJP, block.kelasId).get(day) || 0) + block.size);
          if (block.isHeavy) { if (!kelasHeavyDays.has(block.kelasId)) kelasHeavyDays.set(block.kelasId, new Set()); kelasHeavyDays.get(block.kelasId)!.add(day); }
          // Track guru-kelas adjacency
          const gkKey = `${block.guruId}-${block.kelasId}-${day}`;
          if (!guruKelasDay.has(gkKey)) guruKelasDay.set(gkKey, []);
          guruKelasDay.get(gkKey)!.push({ startJam, endJam: startJam + block.size - 1 });
          block.passPlaced = pass;
          placedThisPass++;
        }
        passResults.push({ pass, label: PASS_LABELS[pass - 1], placed: placedThisPass });
        remaining = nextRemaining;

        // After pass 5: try decomposing failed 3-blocks into 2+1
        if (pass === 5 && remaining.length > 0) {
          const decomposed: Block[] = [];
          const stillFailed: Block[] = [];
          for (const b of remaining) {
            if (b.size === 3) {
              decomposed.push({ ...b, size: 2, difficulty: b.difficulty - 5 });
              decomposed.push({ ...b, size: 1, difficulty: b.difficulty - 10 });
            } else if (b.size === 2) {
              decomposed.push({ ...b, size: 1, difficulty: b.difficulty - 5 });
              decomposed.push({ ...b, size: 1, difficulty: b.difficulty - 10 });
            } else {
              stillFailed.push(b);
            }
          }
          if (decomposed.length > 0) {
            let decomposedPlaced = 0;
            for (const block of decomposed) {
              const result = tryPlace(block, 5);
              if (!result) { block.failReason = 'no_slot'; stillFailed.push(block); continue; }
              const { day, startJam } = result;
              for (let j = startJam; j < startJam + block.size; j++) {
                const sk = slotKey(day, j);
                ensureSet(guruSlots, block.guruId).add(sk);
                ensureSet(kelasSlots, block.kelasId).add(sk);
                let assignedRoom: string | null = null;
                for (const room of rooms) { if (!ensureSet(roomSlots, room.id).has(sk)) { assignedRoom = room.id; roomSlots.get(room.id)!.add(sk); break; } }
                placed.push({ academicYearId, semester, guruId: block.guruId, kelasId: block.kelasId, subjectId: block.subjectId, ruanganId: assignedRoom, dayOfWeek: day, jamKe: j });
              }
              ensureMap(guruDayJP, block.guruId).set(day, (ensureMap(guruDayJP, block.guruId).get(day) || 0) + block.size);
              ensureMap(kelasDayJP, block.kelasId).set(day, (ensureMap(kelasDayJP, block.kelasId).get(day) || 0) + block.size);
              decomposedPlaced++;
            }
            if (decomposedPlaced > 0) passResults.push({ pass: 6, label: 'Decompose blok gagal (pecah 3->2+1, 2->1+1)', placed: decomposedPlaced });
            remaining = stillFailed;
          }
        }
      }

      // Final: set failReason on remaining
      for (const b of remaining) if (!b.failReason) b.failReason = 'no_slot';
      return { placed, failed: remaining, passResults };
    };

    // --- Multiple attempts: 1JP blocks ALWAYS placed last ---
    // --- Multiple attempts: full random + per-attempt chain swap ---
    const MAX_ATTEMPTS = 100;
    const blocksNormal = buildBlocks(false);
    const blocksAutoSplit = buildBlocks(true);
    blocksNormal.sort((a, b) => b.difficulty - a.difficulty);
    blocksAutoSplit.sort((a, b) => b.difficulty - a.difficulty);

    // Chain swap rescue function - applied to each attempt
    const applyChainSwap = (attempt: { placed: any[]; failed: Block[]; passResults: any[] }) => {
      if (attempt.failed.length === 0) return;
      const ss = attempt.placed;
      const gA = new Map<string, number>();
      const kA = new Map<string, number>();
      for (let i = 0; i < ss.length; i++) {
        gA.set(`${ss[i].guruId}-${ss[i].dayOfWeek}-${ss[i].jamKe}`, i);
        kA.set(`${ss[i].kelasId}-${ss[i].dayOfWeek}-${ss[i].jamKe}`, i);
      }
      const gF = (g: string, d: number, j: number) => !gA.has(`${g}-${d}-${j}`);
      const kF = (k: string, d: number, j: number) => !kA.has(`${k}-${d}-${j}`);
      const mv = (idx: number, nd: number, nj: number) => {
        const s = ss[idx];
        gA.delete(`${s.guruId}-${s.dayOfWeek}-${s.jamKe}`);
        kA.delete(`${s.kelasId}-${s.dayOfWeek}-${s.jamKe}`);
        s.dayOfWeek = nd; s.jamKe = nj;
        gA.set(`${s.guruId}-${nd}-${nj}`, idx);
        kA.set(`${s.kelasId}-${nd}-${nj}`, idx);
      };
      const pn = (b: any, d: number, j: number) => {
        ss.push({ academicYearId, semester, guruId: b.guruId, kelasId: b.kelasId, subjectId: b.subjectId, ruanganId: null, dayOfWeek: d, jamKe: j });
        gA.set(`${b.guruId}-${d}-${j}`, ss.length - 1);
        kA.set(`${b.kelasId}-${d}-${j}`, ss.length - 1);
      };

      let rescued = 0;
      let rem = [...attempt.failed];
      let changed = true;
      while (changed && rem.length > 0) {
        changed = false;
        const next: typeof rem = [];
        for (const block of rem) {
          if (block.size > 2) { next.push(block); continue; }
          let ok = false;
          for (const day of dayList) {
            if (ok) break;
            if (guruUnavailDays.get(block.guruId)?.has(day)) continue;
            const jams = availableDays.get(day)!;
            for (let si = 0; si <= jams.length - block.size; si++) {
              let con = true;
              for (let o = 1; o < block.size; o++) { if (jams[si+o] !== jams[si]+o) { con = false; break; } }
              if (!con) continue;
              const sj = jams[si];
              let cf = true;
              for (let j = sj; j < sj + block.size; j++) { if (!kF(block.kelasId, day, j)) { cf = false; break; } }
              if (!cf) continue;
              let af = true;
              for (let j = sj; j < sj + block.size; j++) { if (!gF(block.guruId, day, j)) { af = false; break; } }
              if (af) { for (let j = sj; j < sj + block.size; j++) pn(block, day, j); ok = true; break; }
              if (block.size === 1) {
                const bi = gA.get(`${block.guruId}-${day}-${sj}`);
                if (bi === undefined) continue;
                const b = ss[bi];
                // 1-level swap
                let m1 = false;
                for (const ad of dayList) {
                  if (guruUnavailDays.get(b.guruId)?.has(ad)) continue;
                  for (const aj of availableDays.get(ad)!) {
                    if (ad === day && aj === sj) continue;
                    if (!gF(b.guruId, ad, aj) || !kF(b.kelasId, ad, aj)) continue;
                    mv(bi, ad, aj); pn(block, day, sj); ok = true; m1 = true; break;
                  }
                  if (m1) break;
                }
                if (ok) break;
                // 2-level chain swap
                for (const ad of dayList) {
                  if (ok) break;
                  if (guruUnavailDays.get(b.guruId)?.has(ad)) continue;
                  for (const aj of availableDays.get(ad)!) {
                    if (ad === day && aj === sj) continue;
                    if (!kF(b.kelasId, ad, aj) || gF(b.guruId, ad, aj)) continue;
                    const b2i = gA.get(`${b.guruId}-${ad}-${aj}`);
                    if (b2i === undefined || b2i === bi) continue;
                    for (const ad2 of dayList) {
                      if (ok) break;
                      if (guruUnavailDays.get(ss[b2i].guruId)?.has(ad2)) continue;
                      for (const aj2 of availableDays.get(ad2)!) {
                        if (ad2 === ad && aj2 === aj) continue;
                        if (!gF(ss[b2i].guruId, ad2, aj2) || !kF(ss[b2i].kelasId, ad2, aj2)) continue;
                        mv(b2i, ad2, aj2); mv(bi, ad, aj); pn(block, day, sj); ok = true; break;
                      }
                    }
                    if (ok) break;
                  }
                }
              }
              if (ok) break;
            }
          }
          if (ok) { rescued++; changed = true; } else { next.push(block); }
        }
        rem = next;
      }
      if (rescued > 0) attempt.passResults.push({ pass: 8, label: `Swap rescue (${rescued} blok)`, placed: rescued });
      attempt.failed = rem;
    };

    // Run attempts: each gets its own chain swap rescue
    emit({ phase: 'scheduling', progress: 10, detail: `Attempt 1/${MAX_ATTEMPTS} — ${blocksNormal.length} blok` });
    let bestAttempt = runAttempt([...blocksNormal]);
    applyChainSwap(bestAttempt);

    if (bestAttempt.failed.length > 0) {
      emit({ phase: 'scheduling', progress: 15, detail: `Attempt 2 (auto-split) — ${bestAttempt.failed.length} gagal` });
      const r2 = runAttempt([...blocksAutoSplit]);
      applyChainSwap(r2);
      if (r2.failed.length < bestAttempt.failed.length) bestAttempt = r2;
    }

    for (let a = 2; a < MAX_ATTEMPTS && bestAttempt.failed.length > 0; a++) {
      if (a % 5 === 0) emit({ phase: 'optimizing', progress: 15 + Math.round((a / MAX_ATTEMPTS) * 70), detail: `Attempt ${a + 1}/${MAX_ATTEMPTS} — terbaik: ${bestAttempt.failed.length} gagal` });
      const base = a % 2 === 0 ? blocksAutoSplit : blocksNormal;
      const shuffled = [...base];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const result = runAttempt(shuffled);
      applyChainSwap(result);
      if (result.failed.length < bestAttempt.failed.length) bestAttempt = result;
      if (bestAttempt.failed.length === 0) break;
    }

    // Insert best attempt with version
    emit({ phase: 'saving', progress: 90, detail: `Menyimpan ${bestAttempt.placed.length} slot...` });

    // Count existing versions to auto-name
    let newVersion: any = null;
    let versionNum = 1;
    const totalSlots = blocksNormal.reduce((s, b) => s + b.size, 0);
    const now = new Date();
    try {
      const existingVersions = await db.select().from(jadwalVersion)
        .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)));
      versionNum = existingVersions.length + 1;
      const versionName = `Auto v${versionNum} (${now.getDate()}/${now.getMonth() + 1})`;

      // Deactivate old versions
      if (existingVersions.length > 0) {
        await db.update(jadwalVersion).set({ isAktif: false })
          .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)));
      }

      // Create new version
      [newVersion] = await db.insert(jadwalVersion).values({
        academicYearId, semester, nama: versionName, isAktif: true,
        totalSlots: bestAttempt.placed.length,
        totalFailed: bestAttempt.failed.reduce((s: number, b: any) => s + b.size, 0),
        metadata: { passResults: bestAttempt.passResults, attempts: versionNum },
      }).returning();
    } catch { /* jadwal_version table may not exist yet — skip versioning */ }

    // Insert jadwal rows tagged with versionId (if available)
    if (bestAttempt.placed.length > 0) {
      const taggedSlots = bestAttempt.placed.map((p: any) => ({ ...p, ...(newVersion ? { versionId: newVersion.id } : {}) }));
      for (let i = 0; i < taggedSlots.length; i += 100) {
        await db.insert(kbmJadwal).values(taggedSlots.slice(i, i + 100));
      }
    }
    emit({ phase: 'done', progress: 100, detail: 'Selesai' });

    const versionName = newVersion?.nama || `Auto (${now.getDate()}/${now.getMonth() + 1})`;
    return {
      generated: bestAttempt.placed.length,
      failed: bestAttempt.failed.reduce((s: number, b: any) => s + b.size, 0),
      total: totalSlots,
      blocks: blocksNormal.length,
      failedBlocks: bestAttempt.failed.length,
      versionId: newVersion?.id || null,
      versionName,
      message: `${bestAttempt.placed.length} slot berhasil (${blocksNormal.length} blok)${bestAttempt.failed.length > 0 ? `, ${bestAttempt.failed.length} blok gagal` : ''} — ${versionName}`,
      report: {
        passResults: bestAttempt.passResults,
        attempts: versionNum,
        failedDetails: await Promise.all(bestAttempt.failed.map(async (b: any) => {
          const subj = subjectMap.get(b.subjectId);
          const kelasResult = await db.execute(sql`SELECT name FROM classes WHERE id = ${b.kelasId} LIMIT 1`);
          const kelasRow = ((kelasResult as any).rows || kelasResult)?.[0];
          const kelasName = (kelasRow as any)?.name || b.kelasId;
          return { subject: subj?.nama || b.subjectId, kode: subj?.kode || '?', size: b.size, guruId: b.guruId, kelasId: b.kelasId, subjectId: b.subjectId, kelasName, reason: b.failReason || 'no_slot' };
        })),
      },
    };
  }

  // Find available slots for a guru+kelas combo (for manual placement)
  // Find available slots for a guru+kelas combo (for manual placement)
  static async findAvailableSlots(academicYearId: string, semester: string, guruId: string, kelasId: string) {
    const existing = await db.select({ guruId: kbmJadwal.guruId, kelasId: kbmJadwal.kelasId, dayOfWeek: kbmJadwal.dayOfWeek, jamKe: kbmJadwal.jamKe })
      .from(kbmJadwal).where(and(eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester)));
    const guruBusy = new Set(existing.filter(e => e.guruId === guruId).map(e => `${e.dayOfWeek}-${e.jamKe}`));
    const guruBusyAt = new Map<string, string>();
    for (const e of existing) { if (e.guruId === guruId) guruBusyAt.set(`${e.dayOfWeek}-${e.jamKe}`, e.kelasId); }
    const kelasBusyMap = new Map<string, Set<string>>();
    for (const e of existing) { if (!kelasBusyMap.has(e.kelasId)) kelasBusyMap.set(e.kelasId, new Set()); kelasBusyMap.get(e.kelasId)!.add(`${e.dayOfWeek}-${e.jamKe}`); }
    const kelasRows = await db.execute(sql`SELECT id, name FROM classes ORDER BY name`);
    const kelasNameMap = new Map<string, string>();
    for (const k of (kelasRows as any).rows || kelasRows) { kelasNameMap.set(k.id, k.name); if (!kelasBusyMap.has(k.id)) kelasBusyMap.set(k.id, new Set()); }
    // Use complete time grid — derive max jam per day from existing data, with sensible defaults
    const maxJamPerDay = new Map<number, number>();
    for (const e of existing) {
      const cur = maxJamPerDay.get(e.dayOfWeek) || 0;
      if (e.jamKe > cur) maxJamPerDay.set(e.dayOfWeek, e.jamKe);
    }
    // Ensure all 6 days exist with at minimum defaults: Senin-Kamis=9, Jumat=5, Sabtu=10
    const defaults: Record<number, number> = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 5, 6: 10 };
    for (let d = 1; d <= 6; d++) maxJamPerDay.set(d, Math.max(maxJamPerDay.get(d) || 0, defaults[d] || 9));
    const sortedDays = new Map<number, number[]>();
    for (const [d, mx] of maxJamPerDay) { const jams: number[] = []; for (let j = 1; j <= mx; j++) jams.push(j); sortedDays.set(d, jams); }
    const unavail = await db.select().from(guruUnavailability).where(and(eq(guruUnavailability.academicYearId, academicYearId), eq(guruUnavailability.semester, semester), eq(guruUnavailability.guruId, guruId)));
    const guruUnavailSet = new Set(unavail.map(u => u.dayOfWeek));
    const DAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
    const targetKelasBusy = kelasBusyMap.get(kelasId) || new Set();
    const direct: any[] = [];
    const needSwap: any[] = [];
    const otherClasses: any[] = [];
    for (const [day, jams] of sortedDays) {
      if (guruUnavailSet.has(day)) continue;
      for (const jam of jams) {
        const sk = `${day}-${jam}`;
        const dn = DAY_NAMES[day] || `Hari ${day}`;
        const guruFree = !guruBusy.has(sk);
        if (!targetKelasBusy.has(sk)) {
          if (guruFree) { direct.push({ dayOfWeek: day, jamKe: jam, dayName: dn }); }
          else { const bk = guruBusyAt.get(sk) || ''; needSwap.push({ dayOfWeek: day, jamKe: jam, dayName: dn, blockedByKelas: bk, blockedByKelasName: kelasNameMap.get(bk) || bk }); }
        }
        if (guruFree) {
          for (const [kId, kBusy] of kelasBusyMap) {
            if (kId === kelasId) continue;
            if (!kBusy.has(sk)) { otherClasses.push({ dayOfWeek: day, jamKe: jam, dayName: dn, kelasId: kId, kelasName: kelasNameMap.get(kId) || kId }); }
          }
        }
      }
    }
    return { direct, needSwap, otherClasses: otherClasses.slice(0, 50) };
  }

  static async manualPlaceBlock(academicYearId: string, semester: string, guruId: string, kelasId: string, subjectId: string, dayOfWeek: number, jamKe: number) {
    const activeVer = await this.getActiveVersion(academicYearId, semester);
    const versionConditions: any[] = [eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester), eq(kbmJadwal.dayOfWeek, dayOfWeek), eq(kbmJadwal.jamKe, jamKe), sql`(${kbmJadwal.guruId} = ${guruId} OR ${kbmJadwal.kelasId} = ${kelasId})`];
    if (activeVer) versionConditions.push(eq(kbmJadwal.versionId, activeVer.id));
    const conflicts = await db.select({ id: kbmJadwal.id }).from(kbmJadwal).where(and(...versionConditions));
    if (conflicts.length > 0) throw new Error('Konflik: guru atau kelas sudah terisi di slot ini');
    const [inserted] = await db.insert(kbmJadwal).values({ academicYearId, semester, guruId, kelasId, subjectId, ruanganId: null, dayOfWeek, jamKe, versionId: activeVer?.id || null }).returning();
    return inserted;
  }
    static async moveSlot(id: string, dayOfWeek: number, jamKe: number, ruanganId?: string) {
    const [slot] = await db.select().from(kbmJadwal).where(eq(kbmJadwal.id, id));
    if (!slot) throw new Error('Slot tidak ditemukan');

    // Check conflicts at new position (scoped to same version)
    const conflicts = await db.select({ id: kbmJadwal.id }).from(kbmJadwal).where(and(
      eq(kbmJadwal.academicYearId, slot.academicYearId),
      eq(kbmJadwal.semester, slot.semester),
      eq(kbmJadwal.dayOfWeek, dayOfWeek),
      eq(kbmJadwal.jamKe, jamKe),
      sql`(${kbmJadwal.guruId} = ${slot.guruId} OR ${kbmJadwal.kelasId} = ${slot.kelasId})`,
      sql`${kbmJadwal.id} != ${id}`,
      slot.versionId ? eq(kbmJadwal.versionId, slot.versionId) : sql`${kbmJadwal.versionId} IS NULL`,
    ));

    if (conflicts.length > 0) throw new Error('Konflik: guru atau kelas sudah terisi di slot tujuan');

    const updateData: any = { dayOfWeek, jamKe, updatedAt: new Date() };
    if (ruanganId !== undefined) updateData.ruanganId = ruanganId || null;

    const [updated] = await db.update(kbmJadwal).set(updateData).where(eq(kbmJadwal.id, id)).returning();
    return updated;
  }

  // Pre-move validation: check if a slot can be moved/swapped to a target position
  static async checkMoveSlot(slotId: string, targetDay: number, targetJam: number) {
    const [slot] = await db.select().from(kbmJadwal).where(eq(kbmJadwal.id, slotId));
    if (!slot) return { canMove: false, violations: [{ type: 'not_found', detail: 'Slot tidak ditemukan' }], swapTarget: null };

    const atTarget = await db.select({
      id: kbmJadwal.id, guruId: kbmJadwal.guruId, guruName: employees.name,
      kelasId: kbmJadwal.kelasId, kelasName: classes.name,
      subjectId: kbmJadwal.subjectId, subjectNama: kbmSubjects.nama, subjectKode: kbmSubjects.kode,
      dayOfWeek: kbmJadwal.dayOfWeek, jamKe: kbmJadwal.jamKe,
    }).from(kbmJadwal)
      .leftJoin(employees, eq(kbmJadwal.guruId, employees.id))
      .leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
      .leftJoin(kbmSubjects, eq(kbmJadwal.subjectId, kbmSubjects.id))
      .where(and(
        eq(kbmJadwal.academicYearId, slot.academicYearId), eq(kbmJadwal.semester, slot.semester),
        eq(kbmJadwal.dayOfWeek, targetDay), eq(kbmJadwal.jamKe, targetJam),
        sql`${kbmJadwal.id} != ${slotId}`,
        slot.versionId ? eq(kbmJadwal.versionId, slot.versionId) : sql`${kbmJadwal.versionId} IS NULL`,
      ));

    const violations: { type: string; detail: string; conflictSlotId?: string }[] = [];
    let swapTarget: any = null;

    if (atTarget.length === 0) {
      // Empty cell — check guru/kelas conflicts
      const conflicts = await db.select({
        id: kbmJadwal.id, guruId: kbmJadwal.guruId, guruName: employees.name,
        kelasId: kbmJadwal.kelasId, kelasName: classes.name,
      }).from(kbmJadwal)
        .leftJoin(employees, eq(kbmJadwal.guruId, employees.id))
        .leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
        .where(and(
          eq(kbmJadwal.academicYearId, slot.academicYearId), eq(kbmJadwal.semester, slot.semester),
          eq(kbmJadwal.dayOfWeek, targetDay), eq(kbmJadwal.jamKe, targetJam),
          sql`(${kbmJadwal.guruId} = ${slot.guruId} OR ${kbmJadwal.kelasId} = ${slot.kelasId})`,
          sql`${kbmJadwal.id} != ${slotId}`,
          slot.versionId ? eq(kbmJadwal.versionId, slot.versionId) : sql`${kbmJadwal.versionId} IS NULL`,
        ));
      for (const c of conflicts) {
        if (c.guruId === slot.guruId) violations.push({ type: 'guru_conflict', detail: `${c.guruName} sudah mengajar di ${c.kelasName}`, conflictSlotId: c.id });
        if (c.kelasId === slot.kelasId) violations.push({ type: 'kelas_conflict', detail: `${c.kelasName} sudah ada jadwal lain`, conflictSlotId: c.id });
      }
    } else {
      // Occupied — check swap feasibility
      swapTarget = atTarget[0];
      const origDay = slot.dayOfWeek, origJam = slot.jamKe;
      // Can swapTarget go to slot's original position?
      const c1 = await db.select({ id: kbmJadwal.id, guruId: kbmJadwal.guruId, guruName: employees.name, kelasId: kbmJadwal.kelasId, kelasName: classes.name })
        .from(kbmJadwal).leftJoin(employees, eq(kbmJadwal.guruId, employees.id)).leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
        .where(and(eq(kbmJadwal.academicYearId, slot.academicYearId), eq(kbmJadwal.semester, slot.semester),
          eq(kbmJadwal.dayOfWeek, origDay), eq(kbmJadwal.jamKe, origJam),
          sql`(${kbmJadwal.guruId} = ${swapTarget.guruId} OR ${kbmJadwal.kelasId} = ${swapTarget.kelasId})`,
          sql`${kbmJadwal.id} != ${slotId}`, sql`${kbmJadwal.id} != ${swapTarget.id}`,
        ));
      for (const c of c1) {
        if (c.guruId === swapTarget.guruId) violations.push({ type: 'guru_conflict', detail: `Swap: ${c.guruName} konflik di posisi asal`, conflictSlotId: c.id });
        if (c.kelasId === swapTarget.kelasId) violations.push({ type: 'kelas_conflict', detail: `Swap: ${c.kelasName} konflik di posisi asal`, conflictSlotId: c.id });
      }
      // Can slot go to target position (excluding swapTarget)?
      const c2 = await db.select({ id: kbmJadwal.id, guruId: kbmJadwal.guruId, guruName: employees.name, kelasId: kbmJadwal.kelasId, kelasName: classes.name })
        .from(kbmJadwal).leftJoin(employees, eq(kbmJadwal.guruId, employees.id)).leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
        .where(and(eq(kbmJadwal.academicYearId, slot.academicYearId), eq(kbmJadwal.semester, slot.semester),
          eq(kbmJadwal.dayOfWeek, targetDay), eq(kbmJadwal.jamKe, targetJam),
          sql`(${kbmJadwal.guruId} = ${slot.guruId} OR ${kbmJadwal.kelasId} = ${slot.kelasId})`,
          sql`${kbmJadwal.id} != ${slotId}`, sql`${kbmJadwal.id} != ${swapTarget.id}`,
        ));
      for (const c of c2) {
        if (c.guruId === slot.guruId) violations.push({ type: 'guru_conflict', detail: `${c.guruName} konflik di target`, conflictSlotId: c.id });
        if (c.kelasId === slot.kelasId) violations.push({ type: 'kelas_conflict', detail: `${c.kelasName} konflik di target`, conflictSlotId: c.id });
      }
    }
    return { canMove: violations.length === 0, violations, swapTarget };
  }

  // Atomic swap of two jadwal slots' positions
  static async swapSlots(slotIdA: string, slotIdB: string) {
    const [a] = await db.select().from(kbmJadwal).where(eq(kbmJadwal.id, slotIdA));
    const [b] = await db.select().from(kbmJadwal).where(eq(kbmJadwal.id, slotIdB));
    if (!a || !b) throw new Error('Slot tidak ditemukan');
    const check = await this.checkMoveSlot(slotIdA, b.dayOfWeek, b.jamKe);
    if (!check.canMove) throw new Error(check.violations.map(v => v.detail).join('; '));
    const aDow = a.dayOfWeek, aJam = a.jamKe, aRoom = a.ruanganId;
    const bDow = b.dayOfWeek, bJam = b.jamKe, bRoom = b.ruanganId;
    await db.update(kbmJadwal).set({ dayOfWeek: bDow, jamKe: bJam, ruanganId: bRoom, updatedAt: new Date() }).where(eq(kbmJadwal.id, slotIdA));
    await db.update(kbmJadwal).set({ dayOfWeek: aDow, jamKe: aJam, ruanganId: aRoom, updatedAt: new Date() }).where(eq(kbmJadwal.id, slotIdB));
    return { swapped: true, a: { id: slotIdA, newDay: bDow, newJam: bJam }, b: { id: slotIdB, newDay: aDow, newJam: aJam } };
  }

  static async checkConflicts(academicYearId: string, semester: string) {
    const jadwal = await this.getJadwal(academicYearId, semester);
    const guruConflicts: any[] = [];
    const kelasConflicts: any[] = [];

    // Group by day+jam and check for duplicates
    const guruMap = new Map<string, any[]>();
    const kelasMap = new Map<string, any[]>();

    for (const j of jadwal) {
      const sk = `${j.dayOfWeek}-${j.jamKe}`;
      const gk = `${j.guruId}-${sk}`;
      const kk = `${j.kelasId}-${sk}`;

      if (!guruMap.has(gk)) guruMap.set(gk, []);
      guruMap.get(gk)!.push(j);

      if (!kelasMap.has(kk)) kelasMap.set(kk, []);
      kelasMap.get(kk)!.push(j);
    }

    for (const [, items] of guruMap) {
      if (items.length > 1) guruConflicts.push(items);
    }
    for (const [, items] of kelasMap) {
      if (items.length > 1) kelasConflicts.push(items);
    }

    return { guruConflicts, kelasConflicts, hasConflicts: guruConflicts.length > 0 || kelasConflicts.length > 0 };
  }

  // Soft Constraints Quality Scoring
  static async scoreJadwal(academicYearId: string, semester: string) {
    const jadwal = await this.getJadwal(academicYearId, semester);
    if (jadwal.length === 0) return { score: 0, maxScore: 0, percentage: 0, violations: [], summary: {} };

    const violations: { type: string; detail: string; penalty: number }[] = [];

    // Group by guru-day
    const guruDaySlots = new Map<string, { jamKe: number; subjectNama: string; kelasName: string }[]>();
    // Group by kelas-day
    const kelasDaySlots = new Map<string, { jamKe: number; subjectNama: string; guruName: string; subjectId: string }[]>();

    for (const j of jadwal) {
      const gdk = `${j.guruId}|${j.guruName || ''}|${j.dayOfWeek}`;
      if (!guruDaySlots.has(gdk)) guruDaySlots.set(gdk, []);
      guruDaySlots.get(gdk)!.push({ jamKe: j.jamKe, subjectNama: j.subjectNama || '', kelasName: j.kelasName || '' });

      const kdk = `${j.kelasId}|${j.kelasName || ''}|${j.dayOfWeek}`;
      if (!kelasDaySlots.has(kdk)) kelasDaySlots.set(kdk, []);
      kelasDaySlots.get(kdk)!.push({ jamKe: j.jamKe, subjectNama: j.subjectNama || '', guruName: j.guruName || '', subjectId: j.subjectId });
    }

    const DAY_NAMES: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

    // 1. Guru pagi-siang span (jam 1 and jam 8+ on same day) — penalty 5
    for (const [key, slots] of guruDaySlots) {
      const [, guruName, dayStr] = key.split('|');
      const jams = slots.map(s => s.jamKe).sort((a, b) => a - b);
      if (jams.length >= 2) {
        const span = jams[jams.length - 1] - jams[0];
        if (span >= 7) {
          violations.push({ type: 'guru_span', detail: `${guruName} mengajar jam ${jams[0]}-${jams[jams.length - 1]} (${DAY_NAMES[+dayStr]})`, penalty: 5 });
        }
      }
    }

    // 2. Guru gap hours (hole in schedule) — penalty 3
    for (const [key, slots] of guruDaySlots) {
      const [, guruName, dayStr] = key.split('|');
      const jams = slots.map(s => s.jamKe).sort((a, b) => a - b);
      if (jams.length >= 2) {
        let gaps = 0;
        for (let i = 1; i < jams.length; i++) {
          const diff = jams[i] - jams[i - 1];
          if (diff > 1) gaps += diff - 1;
        }
        if (gaps >= 2) {
          violations.push({ type: 'guru_gap', detail: `${guruName} ada ${gaps} jam kosong di tengah (${DAY_NAMES[+dayStr]})`, penalty: 3 });
        }
      }
    }

    // 3. Heavy subject (Matematika, Fisika, Kimia, etc) at jam >= 7 — penalty 3
    const heavySubjects = await db.select({ id: kbmSubjects.id, nama: kbmSubjects.nama }).from(kbmSubjects).where(eq(kbmSubjects.isHeavy, true));
    const heavyIds = new Set(heavySubjects.map(s => s.id));
    for (const j of jadwal) {
      if (heavyIds.has(j.subjectId) && j.jamKe >= 7) {
        violations.push({ type: 'heavy_afternoon', detail: `${j.subjectNama} di jam ${j.jamKe} (${j.kelasName}, ${DAY_NAMES[j.dayOfWeek]})`, penalty: 3 });
      }
    }

    // 4. Same subject appearing multiple times in same day for same kelas — penalty 2
    for (const [key, slots] of kelasDaySlots) {
      const [, kelasName, dayStr] = key.split('|');
      const subjectCount = new Map<string, number>();
      for (const s of slots) subjectCount.set(s.subjectNama, (subjectCount.get(s.subjectNama) || 0) + 1);
      // Only flag non-consecutive blocks (consecutive is fine for multi-JP)
      const sortedSlots = [...slots].sort((a, b) => a.jamKe - b.jamKe);
      for (const [subj, count] of subjectCount) {
        if (count <= 1) continue;
        const subSlots = sortedSlots.filter(s => s.subjectNama === subj).map(s => s.jamKe);
        let hasGap = false;
        for (let i = 1; i < subSlots.length; i++) { if (subSlots[i] - subSlots[i-1] > 1) { hasGap = true; break; } }
        if (hasGap) {
          violations.push({ type: 'split_subject', detail: `${subj} terpisah di ${kelasName} (${DAY_NAMES[+dayStr]})`, penalty: 2 });
        }
      }
    }

    // 5. Guru distribution — guru teaches all JP in only 1-2 days — penalty 4
    const guruDays = new Map<string, Set<number>>();
    const guruJP = new Map<string, number>();
    for (const j of jadwal) {
      if (!guruDays.has(j.guruId)) guruDays.set(j.guruId, new Set());
      guruDays.get(j.guruId)!.add(j.dayOfWeek);
      guruJP.set(j.guruId, (guruJP.get(j.guruId) || 0) + 1);
    }
    for (const [guruId, days] of guruDays) {
      const jp = guruJP.get(guruId) || 0;
      if (jp >= 12 && days.size <= 2) {
        const gName = jadwal.find(j => j.guruId === guruId)?.guruName || guruId;
        violations.push({ type: 'guru_concentration', detail: `${gName} mengajar ${jp} JP hanya di ${days.size} hari`, penalty: 4 });
      }
    }

    const totalPenalty = violations.reduce((s, v) => s + v.penalty, 0);
    const maxPenalty = Math.max(totalPenalty, 50); // baseline
    const percentage = Math.max(0, Math.round(100 - (totalPenalty / maxPenalty) * 100));

    // Summary by type
    const summary: Record<string, { count: number; totalPenalty: number; label: string }> = {};
    const labels: Record<string, string> = { guru_span: 'Guru Pagi-Siang', guru_gap: 'Gap Jam Guru', heavy_afternoon: 'Mapel Berat Sore', split_subject: 'Mapel Terpisah', guru_concentration: 'Konsentrasi Guru' };
    for (const v of violations) {
      if (!summary[v.type]) summary[v.type] = { count: 0, totalPenalty: 0, label: labels[v.type] || v.type };
      summary[v.type].count++;
      summary[v.type].totalPenalty += v.penalty;
    }

    return { score: Math.max(0, 100 - totalPenalty), maxScore: 100, percentage, totalPenalty, violations, summary, totalSlots: jadwal.length };
  }

  // ═══ Jadwal Versioning ═══════════════════════════════════════════════════

  static async listVersions(academicYearId: string, semester: string) {
    return db.select().from(jadwalVersion)
      .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)))
      .orderBy(desc(jadwalVersion.createdAt));
  }

  static async activateVersion(versionId: string) {
    const [ver] = await db.select().from(jadwalVersion).where(eq(jadwalVersion.id, versionId));
    if (!ver) throw new Error('Versi tidak ditemukan');

    // Deactivate all versions for this academic year + semester
    await db.update(jadwalVersion)
      .set({ isAktif: false })
      .where(and(eq(jadwalVersion.academicYearId, ver.academicYearId), eq(jadwalVersion.semester, ver.semester)));

    // Activate selected version
    await db.update(jadwalVersion).set({ isAktif: true, updatedAt: new Date() }).where(eq(jadwalVersion.id, versionId));

    return { ok: true, nama: ver.nama };
  }

  static async deleteVersion(versionId: string) {
    const [ver] = await db.select().from(jadwalVersion).where(eq(jadwalVersion.id, versionId));
    if (!ver) throw new Error('Versi tidak ditemukan');
    if (ver.isAktif) throw new Error('Tidak bisa hapus versi aktif');

    // Cascade delete will remove associated kbm_jadwal rows
    await db.delete(jadwalVersion).where(eq(jadwalVersion.id, versionId));
    return { ok: true };
  }

  static async renameVersion(versionId: string, nama: string) {
    const [updated] = await db.update(jadwalVersion).set({ nama, updatedAt: new Date() }).where(eq(jadwalVersion.id, versionId)).returning();
    if (!updated) throw new Error('Versi tidak ditemukan');
    return updated;
  }

  static async syncToJurnal(academicYearId: string, semester: string) {
    // Smart merge: only remove teaching_subjects that were KBM-generated
    const jadwal = await this.getJadwal(academicYearId, semester);
    if (jadwal.length === 0) throw new Error('Tidak ada jadwal untuk di-sync');

    // Get academic year info for tahunAjaran string
    const [ay] = await db.select().from(academicYears).where(eq(academicYears.id, academicYearId));
    const tahunAjaran = ay?.tahunAjaran || '';

    // Load time slots for waktu
    const timeSlotRows = await db.execute(sql`
      SELECT day_of_week, jam_ke, waktu_mulai, waktu_selesai FROM jurnal_time_slots
      WHERE is_active = true
    `);
    const timeMap = new Map<string, { waktuMulai: string; waktuSelesai: string }>();
    for (const ts of (timeSlotRows as any).rows || timeSlotRows) {
      timeMap.set(`${ts.day_of_week}-${ts.jam_ke}`, {
        waktuMulai: ts.waktu_mulai || '',
        waktuSelesai: ts.waktu_selesai || '',
      });
    }

    // Delete only KBM-generated teaching_subjects for this semester
    await db.execute(sql`
      DELETE FROM teaching_subjects 
      WHERE kbm_generated = true 
        AND semester = ${semester}
        AND tahun_ajaran = ${tahunAjaran}
    `);

    // Insert new teaching_subjects from jadwal
    const inserts: any[] = [];
    for (const j of jadwal) {
      const ts = timeMap.get(`${j.dayOfWeek}-${j.jamKe}`);
      inserts.push({
        employeeId: j.guruId,
        classId: j.kelasId,
        subjectName: j.subjectNama || '',
        dayOfWeek: j.dayOfWeek,
        jamKe: String(j.jamKe),
        waktuMulai: ts?.waktuMulai || null,
        waktuSelesai: ts?.waktuSelesai || null,
        semester,
        tahunAjaran,
        isActive: true,
        kbmGenerated: true,
      });
    }

    // Bulk insert
    if (inserts.length > 0) {
      for (let i = 0; i < inserts.length; i += 100) {
        await db.insert(teachingSubjects).values(inserts.slice(i, i + 100));
      }
    }

    return { synced: inserts.length, message: `${inserts.length} jadwal berhasil di-sync ke Jurnal Mengajar` };
  }

  static async clearJadwal(academicYearId: string, semester: string) {
    const result = await db.delete(kbmJadwal).where(
      and(eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester))
    ).returning();
    // Also clean up version records (graceful if table doesn't exist)
    try {
      await db.delete(jadwalVersion).where(
        and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester))
      );
    } catch {}
    return { deleted: result.length, message: `${result.length} slot jadwal dihapus` };
  }

  static async deleteJadwalSlot(id: string) {
    const [deleted] = await db.delete(kbmJadwal).where(eq(kbmJadwal.id, id)).returning();
    return deleted;
  }

  // â•â•â• Dashboard â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // â•â•â• Kode Guru â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  static async getGuruWithKode() {
    return db.select({
      id: employees.id,
      name: employees.name,
      nip: employees.nip,
      kodeGuru: employees.kodeGuru,
    }).from(employees).where(eq(employees.type, 'Guru')).orderBy(employees.name);
  }

  static async updateGuruKode(guruId: string, kodeGuru: string) {
    const [updated] = await db.update(employees)
      .set({ kodeGuru: kodeGuru.trim() || null, updatedAt: new Date() })
      .where(eq(employees.id, guruId)).returning();
    return updated;
  }

  static async bulkUpdateGuruKode(updates: { guruId: string; kodeGuru: string }[]) {
    let count = 0;
    for (const u of updates) {
      await db.update(employees)
        .set({ kodeGuru: u.kodeGuru.trim() || null, updatedAt: new Date() })
        .where(eq(employees.id, u.guruId));
      count++;
    }
    return { updated: count, message: `${count} kode guru diperbarui` };
  }

  static async autoAssignGuruKode() {
    const gurus = await db.select({ id: employees.id, name: employees.name })
      .from(employees).where(eq(employees.type, 'Guru')).orderBy(employees.name);
    let count = 0;
    for (let i = 0; i < gurus.length; i++) {
      await db.update(employees)
        .set({ kodeGuru: String(i + 1), updatedAt: new Date() })
        .where(eq(employees.id, gurus[i].id));
      count++;
    }
    return { updated: count, message: `${count} kode guru di-assign otomatis (1, 2, 3, ...)` };
  }

  // â•â•â• Dashboard â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â• Copy Semester â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

  // â•â•â• Export Excel â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
