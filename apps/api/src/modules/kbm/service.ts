import { db } from "../../db";
import {
  distribusiJam, tugasTambahanMaster, tugasTambahan,
  ruangan, employees, classes, academicYears, masterSubjects,
  kbmJadwal, teachingSubjects, guruUnavailability, scheduleConfig,
  jadwalVersion, guruSlotAvailability, schedulingRules,
  subjectSlotAvailability,
} from "../../db/schema";
import { eq, and, sql, desc, asc, inArray, notInArray } from "drizzle-orm";

const JTM_LIMIT = 40; // Default batas maksimal JTM per guru per semester

export class KbmService {

  // â•â•â• Subjects (Mapel) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  static async getSubjects(activeOnly = false) {
    if (activeOnly) {
      return db.select().from(masterSubjects).where(eq(masterSubjects.isActive, true)).orderBy(masterSubjects.kode);
    }
    return db.select().from(masterSubjects).orderBy(masterSubjects.kode);
  }

  static async createSubject(data: { kode: string; nama: string }) {
    const results = await db.insert(masterSubjects).values(data).returning();
    return results[0];
  }

  static async updateSubject(id: string, data: { kode?: string; nama?: string; isActive?: boolean; maxJamKe?: number | null; minJamKe?: number | null; allowSingleSplit?: boolean; isHeavy?: boolean; customSplitRule?: any }) {
    const results = await db.update(masterSubjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(masterSubjects.id, id)).returning();
    return results[0] || null;
  }

  static async deleteSubject(id: string) {
    const results = await db.update(masterSubjects)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(masterSubjects.id, id)).returning();
    return results[0] || null;
  }

  static async seedDefaultSubjects() {
    // Copy from jurnal_mapel_codes if kbm_subjects is empty
    const existing = await db.select().from(masterSubjects);
    if (existing.length > 0) return { seeded: 0, message: "Sudah ada data mapel" };

    const mapelCodes = await db.select().from(masterSubjects).orderBy(masterSubjects.kode);
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
      await db.insert(masterSubjects).values(defaults).onConflictDoNothing({ target: masterSubjects.kode });
      return { seeded: defaults.length, message: "Seed dari data default" };
    }

    const values = mapelCodes.map(mc => ({ kode: mc.kode, nama: mc.nama }));
    await db.insert(masterSubjects).values(values).onConflictDoNothing({ target: masterSubjects.kode });
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
      guruKodeGuru: employees.kodeGuru,
      kelasId: distribusiJam.kelasId,
      kelasName: classes.name,
      subjectId: distribusiJam.subjectId,
      subjectKode: masterSubjects.kode,
      subjectNama: masterSubjects.nama,
      jumlahJam: distribusiJam.jumlahJam,
    })
    .from(distribusiJam)
    .leftJoin(employees, eq(distribusiJam.guruId, employees.id))
    .leftJoin(classes, eq(distribusiJam.kelasId, classes.id))
    .leftJoin(masterSubjects, eq(distribusiJam.subjectId, masterSubjects.id))
    .where(and(
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
    ))
    .orderBy(sql`CAST(NULLIF(${employees.kodeGuru}, '') AS INTEGER) ASC NULLS LAST`, masterSubjects.kode, classes.name);
  }

  static async syncGuruSubjects(guruId: string, academicYearId: string, semester: string, subjectIds: string[]) {
    if (subjectIds.length === 0) {
      await db.delete(distribusiJam).where(and(
        eq(distribusiJam.guruId, guruId),
        eq(distribusiJam.academicYearId, academicYearId),
        eq(distribusiJam.semester, semester)
      ));
      return { deleted: true };
    }
    
    // Delete any distribution for subjects NOT in the checked list
    await db.delete(distribusiJam).where(and(
      eq(distribusiJam.guruId, guruId),
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
      notInArray(distribusiJam.subjectId, subjectIds)
    ));
    return { synced: true };
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
    // First, nullify all references in kbm_jadwal to avoid any FK constraint errors
    await db.update(kbmJadwal)
      .set({ ruanganId: null, updatedAt: new Date() })
      .where(eq(kbmJadwal.ruanganId, id));
    
    // Now safely delete the ruangan
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
    const subjectList = await db.select({ id: masterSubjects.id, kode: masterSubjects.kode, nama: masterSubjects.nama })
      .from(masterSubjects).where(eq(masterSubjects.isActive, true)).orderBy(masterSubjects.kode);

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
    const subjectList = await db.select({ id: masterSubjects.id, kode: masterSubjects.kode, nama: masterSubjects.nama })
      .from(masterSubjects).where(eq(masterSubjects.isActive, true));
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
      subjectKode: masterSubjects.kode,
      subjectNama: masterSubjects.nama,
      ruanganId: kbmJadwal.ruanganId,
      ruanganNama: ruangan.nama,
      dayOfWeek: kbmJadwal.dayOfWeek,
      jamKe: kbmJadwal.jamKe,
    })
      .from(kbmJadwal)
      .leftJoin(employees, eq(kbmJadwal.guruId, employees.id))
      .leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
      .leftJoin(masterSubjects, eq(kbmJadwal.subjectId, masterSubjects.id))
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

  // ═══ Guru Slot Availability (Per Hari × Jam) ═══════════════════════════════

  static async getGuruSlotAvailability(guruId: string, academicYearId: string, semester: string) {
    return db.select({
      id: guruSlotAvailability.id,
      guruId: guruSlotAvailability.guruId,
      dayOfWeek: guruSlotAvailability.dayOfWeek,
      jamKe: guruSlotAvailability.jamKe,
      status: guruSlotAvailability.status,
      reason: guruSlotAvailability.reason,
    })
      .from(guruSlotAvailability)
      .where(and(
        eq(guruSlotAvailability.guruId, guruId),
        eq(guruSlotAvailability.academicYearId, academicYearId),
        eq(guruSlotAvailability.semester, semester),
      ))
      .orderBy(guruSlotAvailability.dayOfWeek, guruSlotAvailability.jamKe);
  }

  static async getAllGuruSlotAvailability(academicYearId: string, semester: string) {
    return db.select({
      guruId: guruSlotAvailability.guruId,
      dayOfWeek: guruSlotAvailability.dayOfWeek,
      jamKe: guruSlotAvailability.jamKe,
      status: guruSlotAvailability.status,
    })
      .from(guruSlotAvailability)
      .where(and(
        eq(guruSlotAvailability.academicYearId, academicYearId),
        eq(guruSlotAvailability.semester, semester),
      ));
  }

  static async bulkSetGuruSlotAvailability(
    guruId: string, academicYearId: string, semester: string,
    slots: { dayOfWeek: number; jamKe: number; status: string; reason?: string }[]
  ) {
    await db.delete(guruSlotAvailability).where(and(
      eq(guruSlotAvailability.guruId, guruId),
      eq(guruSlotAvailability.academicYearId, academicYearId),
      eq(guruSlotAvailability.semester, semester),
    ));
    const nonDefault = slots.filter(s => s.status !== 'available');
    if (nonDefault.length === 0) return { count: 0, message: 'Semua slot tersedia (default)' };
    const values = nonDefault.map(s => ({
      guruId, academicYearId, semester,
      dayOfWeek: s.dayOfWeek, jamKe: s.jamKe,
      status: s.status, reason: s.reason || null,
    }));
    await db.insert(guruSlotAvailability).values(values);
    return { count: nonDefault.length, message: `${nonDefault.length} slot constraint disimpan` };
  }

  static async migrateFromDayUnavailability(academicYearId: string, semester: string) {
    const dayUnavail = await db.select().from(guruUnavailability).where(and(
      eq(guruUnavailability.academicYearId, academicYearId),
      eq(guruUnavailability.semester, semester),
    ));
    if (dayUnavail.length === 0) return { migrated: 0, message: 'Tidak ada data hari kosong untuk dimigrasi' };
    const timeSlots = await db.execute(sql`SELECT DISTINCT day_of_week, jam_ke FROM jurnal_time_slots WHERE is_active = true ORDER BY day_of_week, jam_ke`);
    const dayJams = new Map<number, number[]>();
    for (const ts of (timeSlots as any).rows || timeSlots) {
      const d = Number(ts.day_of_week), j = Number(ts.jam_ke);
      if (!dayJams.has(d)) dayJams.set(d, []);
      dayJams.get(d)!.push(j);
    }
    if (dayJams.size === 0) { for (let d = 1; d <= 6; d++) dayJams.set(d, [1, 2, 3, 4, 5, 6, 7, 8]); }
    const slotEntries: { guruId: string; dayOfWeek: number; jamKe: number; status: string; reason?: string }[] = [];
    for (const u of dayUnavail) {
      const jams = dayJams.get(u.dayOfWeek) || [1, 2, 3, 4, 5, 6, 7, 8];
      for (const jam of jams) {
        slotEntries.push({ guruId: u.guruId, dayOfWeek: u.dayOfWeek, jamKe: jam, status: 'unavailable', reason: u.reason || undefined });
      }
    }
    const guruIds = [...new Set(slotEntries.map(e => e.guruId))];
    let totalMigrated = 0;
    for (const gId of guruIds) {
      const guruSlots = slotEntries.filter(e => e.guruId === gId);
      await this.bulkSetGuruSlotAvailability(gId, academicYearId, semester, guruSlots);
      totalMigrated += guruSlots.length;
    }
    return { migrated: totalMigrated, gurus: guruIds.length, message: `Migrasi ${guruIds.length} guru (${totalMigrated} slot) berhasil` };
  }

  static async setAllGuruSlotsAvailable(academicYearId: string, semester: string) {
    const result = await db.delete(guruSlotAvailability).where(and(
      eq(guruSlotAvailability.academicYearId, academicYearId),
      eq(guruSlotAvailability.semester, semester),
    )).returning();
    return { cleared: result.length, message: `${result.length} constraint dihapus` };
  }

  // ═══ Schedule Config ═══════════════════════════════════════════

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

  // ═══ Jadwal — Full Constraint-Aware Scheduler (Rebuilt) ═════

  static async generateJadwal(
    academicYearId: string,
    semester: string,
    clearExisting = true,
    options: {
      difficulty?: 'normal' | 'besar' | 'sangat_besar';
      constraintMode?: 'konsep' | 'relax' | 'istirahat' | 'tepat';
    } = {},
    onProgress?: (data: { phase: string; progress: number; detail?: string }) => void
  ) {
    const emit = onProgress || (() => {});
    const difficulty = options.difficulty || 'normal';
    const constraintMode = options.constraintMode || 'relax';

    emit({ phase: 'init', progress: 0, detail: 'Mempersiapkan data...' });

    // --- Clear existing jadwal ---
    if (clearExisting) {
      const activeVer = await this.getActiveVersion(academicYearId, semester);
      if (activeVer) {
        await db.delete(kbmJadwal).where(and(
          eq(kbmJadwal.academicYearId, academicYearId),
          eq(kbmJadwal.semester, semester),
          eq(kbmJadwal.versionId, activeVer.id),
        ));
        try { await db.update(jadwalVersion).set({ isAktif: false }).where(eq(jadwalVersion.id, activeVer.id)); } catch {}
      } else {
        await db.delete(kbmJadwal).where(and(
          eq(kbmJadwal.academicYearId, academicYearId),
          eq(kbmJadwal.semester, semester),
        ));
      }
    }

    // --- 1. Load all data ---

    // Ruangan & class mapping
    const activeRuangan = await db.select().from(ruangan).where(eq(ruangan.isActive, true));
    const ruanganNames = new Set<string>();
    for (const r of activeRuangan) {
      ruanganNames.add((r.nama || '').toLowerCase());
      ruanganNames.add((r.nama || '').replace(/^Ruang\s+/i, '').trim().toLowerCase());
    }
    const allClasses = await db.select().from(classes);
    const validClassIds = new Set(
      allClasses.filter(c => {
        const name = c.name.toLowerCase();
        const nameNoRuang = c.name.replace(/^Ruang\s+/i, '').trim().toLowerCase();
        return ruanganNames.has(name) || ruanganNames.has(nameNoRuang);
      }).map(c => c.id)
    );

    // Distribusi jam
    const distribusiRaw = await db.select({
      guruId: distribusiJam.guruId, kelasId: distribusiJam.kelasId,
      subjectId: distribusiJam.subjectId, jumlahJam: distribusiJam.jumlahJam,
    }).from(distribusiJam).where(and(
      eq(distribusiJam.academicYearId, academicYearId),
      eq(distribusiJam.semester, semester),
    ));
    const distribusi = (activeRuangan.length > 0 && validClassIds.size > 0)
      ? distribusiRaw.filter(d => validClassIds.has(d.kelasId))
      : distribusiRaw;

    if (distribusi.length === 0) {
      return { generated: 0, failed: 0, total: 0, blocks: 0, failedBlocks: 0, message: 'Tidak ada distribusi jam', report: null };
    }
    emit({ phase: 'init', progress: 3, detail: `${distribusi.length} distribusi dimuat` });

    // Subjects (master_subjects -- source of truth for constraints)
    const subjectList = await db.select().from(masterSubjects).where(eq(masterSubjects.isActive, true));
    const subjectMap = new Map(subjectList.map(s => [s.id, s]));

    // Guru unavailability (hari kosong)
    const unavail = await db.select().from(guruUnavailability).where(and(
      eq(guruUnavailability.academicYearId, academicYearId),
      eq(guruUnavailability.semester, semester),
    ));
    const guruUnavailDays = new Map<string, Set<number>>();
    for (const u of unavail) {
      if (!guruUnavailDays.has(u.guruId)) guruUnavailDays.set(u.guruId, new Set());
      guruUnavailDays.get(u.guruId)!.add(u.dayOfWeek);
    }

    // Guru per-slot availability
    const slotAvailData = await this.getAllGuruSlotAvailability(academicYearId, semester);
    const guruSlotStatusMap = new Map<string, string>();
    for (const sa of slotAvailData) {
      guruSlotStatusMap.set(`${sa.guruId}-${sa.dayOfWeek}-${sa.jamKe}`, sa.status);
    }
    const getGuruSlotStatus = (guruId: string, day: number, jam: number): string =>
      guruSlotStatusMap.get(`${guruId}-${day}-${jam}`) || 'available';
    emit({ phase: 'init', progress: 5, detail: `${slotAvailData.length} guru slot constraint dimuat` });

    // Subject per-slot availability (waktu kosong mapel)
    const subjectSlotData = await db.select({
      subjectId: subjectSlotAvailability.subjectId,
      dayOfWeek: subjectSlotAvailability.dayOfWeek,
      jamKe: subjectSlotAvailability.jamKe,
      status: subjectSlotAvailability.status,
    }).from(subjectSlotAvailability);
    const subjectSlotStatusMap = new Map<string, string>();
    for (const ss of subjectSlotData) {
      subjectSlotStatusMap.set(`${ss.subjectId}-${ss.dayOfWeek}-${ss.jamKe}`, ss.status);
    }
    const getSubjectSlotStatus = (subjectId: string, day: number, jam: number): string =>
      subjectSlotStatusMap.get(`${subjectId}-${day}-${jam}`) || 'available';
    emit({ phase: 'init', progress: 7, detail: `${subjectSlotData.length} subject slot constraint dimuat` });

    // Scheduling rules (aturan jadwal aktif)
    const allRules = await db.select().from(schedulingRules).where(eq(schedulingRules.isActive, true));
    emit({ phase: 'init', progress: 8, detail: `${allRules.length} aturan jadwal aktif dimuat` });

    // Pre-process scheduling rules by type
    const rulesByType = {
      not_same_day: allRules.filter(r => r.ruleType === 'not_same_day'),
      must_first_or_last: allRules.filter(r => r.ruleType === 'must_first_or_last'),
      same_period_daily: allRules.filter(r => r.ruleType === 'same_period_daily'),
    };

    // Schedule config
    const config = await this.getScheduleConfig(academicYearId, semester);
    const splitRules: Record<string, number[]> = (config.defaultSplitRules as any) || {
      '2': [2], '3': [3], '4': [2, 2], '5': [3, 2], '6': [3, 3],
    };

    // Time slots -> available days/jams grid
    const timeSlots = await db.execute(sql`
      SELECT DISTINCT day_of_week, jam_ke FROM jurnal_time_slots
      WHERE is_active = true ORDER BY day_of_week, jam_ke
    `);
    const availableDays = new Map<number, number[]>();
    for (const ts of (timeSlots as any).rows || timeSlots) {
      const d = Number(ts.day_of_week), j = Number(ts.jam_ke);
      if (!availableDays.has(d)) availableDays.set(d, []);
      availableDays.get(d)!.push(j);
    }
    // Fallback if no time slots configured
    if (availableDays.size === 0) {
      for (let d = 1; d <= 6; d++) availableDays.set(d, [1, 2, 3, 4, 5, 6, 7, 8]);
    }

    const rooms = await db.select({ id: ruangan.id, nama: ruangan.nama }).from(ruangan).where(eq(ruangan.isActive, true));
    const dayList = Array.from(availableDays.keys()).sort((a, b) => a - b);
    const daySlotCount = new Map<number, number>();
    for (const [d, jams] of availableDays) daySlotCount.set(d, jams.length);

    // Pre-compute guru total JP for distribution balance
    const guruTotalJP = new Map<string, number>();
    for (const d of distribusi) {
      guruTotalJP.set(d.guruId, (guruTotalJP.get(d.guruId) || 0) + d.jumlahJam);
    }

    emit({ phase: 'init', progress: 10, detail: 'Data siap, membangun blok...' });

    // --- 2. Build blocks from distribusi ---

    type Block = {
      guruId: string; kelasId: string; subjectId: string; size: number;
      isHeavy: boolean; maxJamKe: number | null; minJamKe: number | null;
      oncePerDay: boolean; canBeOverLunch: boolean; doubleLessonsOverBreaks: boolean;
      isTemporary: boolean;
      difficulty: number; failReason?: string; passPlaced?: number;
    };

    const buildBlocks = (forceAutoSplit = false): Block[] => {
      const result: Block[] = [];
      for (const d of distribusi) {
        const subject = subjectMap.get(d.subjectId);
        const isHeavy = subject?.isHeavy || false;
        const maxJamKe = subject?.maxJamKe || null;
        const minJamKe = subject?.minJamKe || null;
        const oncePerDay = (subject as any)?.oncePerDay || false;
        const canBeOverLunch = (subject as any)?.canBeOverLunch ?? true;
        const doubleLessonsOverBreaks = (subject as any)?.doubleLessonsOverBreaks || false;
        const isTemporary = (subject as any)?.isTemporary || false;
        const allowSingle = subject?.allowSingleSplit || false;
        const customSplit = subject?.customSplitRule as Record<string, number[]> | null;
        const jp = d.jumlahJam;
        if (jp <= 0) continue;

        let blockSizes: number[];
        if (customSplit && customSplit[String(jp)]) {
          blockSizes = customSplit[String(jp)];
        } else if (splitRules[String(jp)]) {
          blockSizes = [...splitRules[String(jp)]];
        } else {
          blockSizes = [];
          let rem = jp;
          while (rem > 0) {
            if (rem >= 3 && rem !== 4) { blockSizes.push(3); rem -= 3; }
            else if (rem >= 2) { blockSizes.push(2); rem -= 2; }
            else { blockSizes.push(1); rem -= 1; }
          }
        }

        // Optional further splitting if allowed
        if ((forceAutoSplit || allowSingle) && !customSplit) {
          if (jp === 3 && blockSizes.length === 1 && blockSizes[0] === 3) blockSizes = [2, 1];
          else if (jp === 5 && blockSizes.length === 2 && blockSizes[0] === 3 && blockSizes[1] === 2) blockSizes = [2, 2, 1];
        }

        // Compute constraint difficulty for sorting priority
        const guruUnavailCount = guruUnavailDays.get(d.guruId)?.size || 0;
        let subjectSlotConstraints = 0;
        for (const day of dayList) {
          for (const jam of availableDays.get(day)!) {
            if (getSubjectSlotStatus(d.subjectId, day, jam) !== 'available') subjectSlotConstraints++;
          }
        }

        for (const size of blockSizes) {
          const diff = size * 10
            + (isHeavy ? 50 : 0)
            + (maxJamKe ? 30 : 0)
            + (minJamKe ? 30 : 0)
            + (oncePerDay ? 20 : 0)
            + guruUnavailCount * 15
            + subjectSlotConstraints * 5
            + (guruTotalJP.get(d.guruId)! > 20 ? 20 : 0);
          result.push({
            guruId: d.guruId, kelasId: d.kelasId, subjectId: d.subjectId, size,
            isHeavy, maxJamKe, minJamKe, oncePerDay, canBeOverLunch,
            doubleLessonsOverBreaks, isTemporary, difficulty: diff,
          });
        }
      }
      return result;
    };

    // --- 3. Helpers ---

    const slotKey = (day: number, jam: number) => `${day}-${jam}`;
    const ensureSet = (map: Map<string, Set<string>>, key: string) => {
      if (!map.has(key)) map.set(key, new Set());
      return map.get(key)!;
    };
    const ensureNumMap = (map: Map<string, Map<number, number>>, key: string) => {
      if (!map.has(key)) map.set(key, new Map());
      return map.get(key)!;
    };

    // Difficulty -> attempts, constraintMode -> pass count
    const MAX_ATTEMPTS_MAP: Record<string, number> = { normal: 50, besar: 200, sangat_besar: 500 };
    const MAX_ATTEMPTS = MAX_ATTEMPTS_MAP[difficulty] || 50;
    const PASS_COUNT = constraintMode === 'konsep' ? 2 : constraintMode === 'tepat' ? 3 : 5;
    const PASS_LABELS = [
      'Strict (semua constraint)',
      'Relax distribusi merata',
      'Relax afternoon + daily limit',
      'Relax heavy + scheduling rules',
      'Force (hard constraint only)',
    ];

    // --- 4. Check scheduling rules for a block placement ---

    const checkSchedulingRules = (
      block: Block, day: number, startJam: number, endJamVal: number,
      subjectKelasDay: Map<string, Set<number>>,
      subjectKelasJam: Map<string, Map<number, number>>,
      passLevel: number,
    ): { ok: boolean; penalty: number } => {
      let penalty = 0;

      // Rule: not_same_day
      for (const rule of rulesByType.not_same_day) {
        const subjectIds = (rule.subjectIds || []) as string[];
        if (!subjectIds.includes(block.subjectId)) continue;
        if (rule.classScope === 'selected' && rule.classIds) {
          if (!(rule.classIds as string[]).includes(block.kelasId)) continue;
        }
        for (const otherId of subjectIds) {
          if (otherId === block.subjectId) continue;
          const skKey = `${otherId}-${block.kelasId}`;
          if (subjectKelasDay.get(skKey)?.has(day)) {
            const isHigh = rule.priority === 'high';
            if (isHigh || constraintMode === 'tepat') return { ok: false, penalty: 0 };
            if (passLevel < 4) return { ok: false, penalty: 0 };
            penalty += 60;
          }
        }
      }

      // Rule: must_first_or_last
      for (const rule of rulesByType.must_first_or_last) {
        const subjectIds = (rule.subjectIds || []) as string[];
        if (!subjectIds.includes(block.subjectId)) continue;
        if (rule.classScope === 'selected' && rule.classIds) {
          if (!(rule.classIds as string[]).includes(block.kelasId)) continue;
        }
        const dayJams = availableDays.get(day)!;
        const firstJam = dayJams[0];
        const lastJam = dayJams[dayJams.length - 1];
        const position = (rule.params as any)?.position;
        const atFirst = startJam === firstJam;
        const atLast = endJamVal === lastJam;

        let posOk = false;
        if (position === 'first') posOk = atFirst;
        else if (position === 'last') posOk = atLast;
        else posOk = atFirst || atLast;

        if (!posOk) {
          if (constraintMode === 'tepat' || rule.priority === 'high') return { ok: false, penalty: 0 };
          if (passLevel < 3) return { ok: false, penalty: 0 };
          penalty += 40;
        }
      }

      // Rule: same_period_daily
      for (const rule of rulesByType.same_period_daily) {
        const subjectIds = (rule.subjectIds || []) as string[];
        if (!subjectIds.includes(block.subjectId)) continue;
        if (rule.classScope === 'selected' && rule.classIds) {
          if (!(rule.classIds as string[]).includes(block.kelasId)) continue;
        }
        const existingJamKey = `${block.subjectId}-${block.kelasId}`;
        const existingJamMap = subjectKelasJam.get(existingJamKey);
        if (existingJamMap && existingJamMap.size > 0) {
          const existingJams = Array.from(existingJamMap.values());
          const targetJam = existingJams[0];
          if (startJam !== targetJam) {
            if (constraintMode === 'tepat') return { ok: false, penalty: 0 };
            if (passLevel < 3) return { ok: false, penalty: 0 };
            penalty += 30;
          }
        }
      }

      return { ok: true, penalty };
    };

    // --- 5. Core placement function ---

    const runAttempt = (blocks: Block[]): {
      placed: any[]; failed: Block[];
      passResults: { pass: number; label: string; placed: number }[];
    } => {
      const guruSlotsUsed = new Map<string, Set<string>>();
      const kelasSlotsUsed = new Map<string, Set<string>>();
      const roomSlotsUsed = new Map<string, Set<string>>();
      const guruDayJP = new Map<string, Map<number, number>>();
      const kelasDayJP = new Map<string, Map<number, number>>();
      const kelasHeavyDays = new Map<string, Set<number>>();
      const guruBlocksPerDay = new Map<string, Map<number, number>>();
      const subjectKelasDay = new Map<string, Set<number>>();
      const subjectKelasJam = new Map<string, Map<number, number>>();
      const guruDayJams = new Map<string, Map<number, number[]>>();

      // Precompute total blocks per guru for idealMaxBlocksPerDay
      const guruTotalBlocks = new Map<string, number>();
      for (const b of blocks) {
        guruTotalBlocks.set(b.guruId, (guruTotalBlocks.get(b.guruId) || 0) + 1);
      }

      const placed: any[] = [];
      const passResults: { pass: number; label: string; placed: number }[] = [];

      const tryPlace = (block: Block, passLevel: number): { day: number; startJam: number; score: number } | null => {
        const threshold = (config as any).maxDailyJpThreshold || 20;
        const maxDailyLimit = (config as any).maxDailyJpLimit || 6;
        const totalJP = guruTotalJP.get(block.guruId) || 0;
        let best: { day: number; startJam: number; score: number } | null = null;

        const activeDays = dayList.filter(d => !guruUnavailDays.get(block.guruId)?.has(d)).length;
        const totalBlocksForGuru = guruTotalBlocks.get(block.guruId) || 1;
        const idealMaxBlocksPerDay = activeDays > 0 ? Math.ceil(totalBlocksForGuru / activeDays) : 99;

        for (const day of dayList) {
          // HARD: guru hari kosong
          if (guruUnavailDays.get(block.guruId)?.has(day)) continue;

          // HARD: same subject already on this day in same class
          const skdKey = `${block.subjectId}-${block.kelasId}`;
          if (subjectKelasDay.get(skdKey)?.has(day)) continue;

          // SOFT: heavy subject -- no 2 heavy subjects same day in same class
          if (block.isHeavy && kelasHeavyDays.get(block.kelasId)?.has(day)) {
            if (constraintMode === 'tepat') continue;
            if (passLevel < 4) continue;
          }

          // SOFT: even block distribution per day for guru
          const guruBlocksThisDay = ensureNumMap(guruBlocksPerDay, block.guruId).get(day) || 0;
          if (constraintMode !== 'konsep') {
            if (passLevel <= 1 && guruBlocksThisDay >= idealMaxBlocksPerDay) continue;
          }

          // SOFT: daily JP limit for high-JP gurus
          if (constraintMode !== 'konsep' && passLevel < 3) {
            if (totalJP > threshold) {
              const curJP = ensureNumMap(guruDayJP, block.guruId).get(day) || 0;
              if (curJP + block.size > maxDailyLimit) continue;
            }
          }

          const currentGuruDayJP = ensureNumMap(guruDayJP, block.guruId).get(day) || 0;
          const targetPerDay = activeDays > 0 ? Math.ceil(totalJP / activeDays) : 99;
          const isOverloaded = currentGuruDayJP >= Math.ceil(targetPerDay * 1.5);
          if (constraintMode !== 'konsep' && passLevel < 2 && isOverloaded) continue;

          // maxJamKe -- HARD constraint (with Friday exception from config)
          const enforceMaxJam = block.maxJamKe && !((config as any).afternoonExcludeFriday && day === 5);

          const jams = availableDays.get(day)!;

          for (let si = 0; si <= jams.length - block.size; si++) {
            // Check consecutive slots
            let consecutive = true;
            for (let o = 1; o < block.size; o++) {
              if (jams[si + o] !== jams[si] + o) { consecutive = false; break; }
            }
            if (!consecutive) continue;

            const startJam = jams[si];
            const endJam = startJam + block.size - 1;

            // HARD: maxJamKe / minJamKe
            if (enforceMaxJam && endJam > block.maxJamKe!) continue;
            if (block.minJamKe && startJam < block.minJamKe) continue;

            // HARD: guru clash, kelas clash, guru slot unavailable, subject slot unavailable
            let allFree = true;
            let hasUnavailable = false;
            let conditionalCount = 0;
            let subjectSlotPenalty = 0;

            for (let j = startJam; j <= endJam; j++) {
              const sk = slotKey(day, j);
              if (ensureSet(guruSlotsUsed, block.guruId).has(sk) || ensureSet(kelasSlotsUsed, block.kelasId).has(sk)) {
                allFree = false; break;
              }
              const guruSS = getGuruSlotStatus(block.guruId, day, j);
              if (guruSS === 'unavailable') { hasUnavailable = true; break; }
              if (guruSS === 'conditional') conditionalCount++;

              const subjSS = getSubjectSlotStatus(block.subjectId, day, j);
              if (subjSS === 'unavailable') { hasUnavailable = true; break; }
              if (subjSS === 'conditional') subjectSlotPenalty += 20;
            }
            if (!allFree || hasUnavailable) continue;

            // Check scheduling rules
            const ruleCheck = checkSchedulingRules(
              block, day, startJam, endJam,
              subjectKelasDay, subjectKelasJam, passLevel,
            );
            if (!ruleCheck.ok) continue;

            // Istirahat mode: check guru has at least 1 gap on this day
            let istirahatPenalty = 0;
            if (constraintMode === 'istirahat' && passLevel < 4) {
              const guruJamsToday = guruDayJams.get(block.guruId)?.get(day) || [];
              if (guruJamsToday.length > 0) {
                const allJams = [...guruJamsToday];
                for (let j = startJam; j <= endJam; j++) allJams.push(j);
                allJams.sort((a, b) => a - b);
                let maxStretch = 1, curStretch = 1;
                for (let i = 1; i < allJams.length; i++) {
                  if (allJams[i] === allJams[i - 1] + 1) { curStretch++; maxStretch = Math.max(maxStretch, curStretch); }
                  else curStretch = 1;
                }
                if (maxStretch > 4) {
                  if (passLevel < 3) continue;
                  istirahatPenalty += (maxStretch - 4) * 25;
                }
              }
            }

            // === SCORING ===
            let score = 100;
            score -= conditionalCount * 30;
            score -= subjectSlotPenalty;
            if (conditionalCount === 0 && subjectSlotPenalty === 0) score += 10;
            score -= ruleCheck.penalty;
            if (block.isHeavy) score += (10 - startJam) * 3;
            if (guruBlocksThisDay >= idealMaxBlocksPerDay) score -= 100;
            score -= guruBlocksThisDay * 25;
            score -= currentGuruDayJP * 12;
            score -= (ensureNumMap(kelasDayJP, block.kelasId).get(day) || 0) * 2;
            if (isOverloaded) score -= 50;
            if (kelasHeavyDays.get(block.kelasId)?.has(day)) score -= 20;
            score -= istirahatPenalty;
            if (startJam === jams[0]) score += 3;
            if (endJam === jams[jams.length - 1]) score += 3;

            if (!best || score > best.score) best = { day, startJam, score };
          }
        }
        return best;
      };

      // --- Multi-pass placement ---

      let remaining = [...blocks];
      for (let pass = 1; pass <= PASS_COUNT; pass++) {
        if (remaining.length === 0) break;
        const nextRemaining: Block[] = [];
        let placedThisPass = 0;

        for (const block of remaining) {
          const result = tryPlace(block, pass);
          if (!result) { nextRemaining.push(block); continue; }

          const { day, startJam } = result;
          for (let j = startJam; j < startJam + block.size; j++) {
            const sk = slotKey(day, j);
            ensureSet(guruSlotsUsed, block.guruId).add(sk);
            ensureSet(kelasSlotsUsed, block.kelasId).add(sk);
            let assignedRoom: string | null = null;
            for (const room of rooms) {
              if (!ensureSet(roomSlotsUsed, room.id).has(sk)) {
                assignedRoom = room.id;
                roomSlotsUsed.get(room.id)!.add(sk);
                break;
              }
            }
            placed.push({
              academicYearId, semester,
              guruId: block.guruId, kelasId: block.kelasId,
              subjectId: block.subjectId, ruanganId: assignedRoom,
              dayOfWeek: day, jamKe: j,
            });
          }

          // Update tracking maps
          ensureNumMap(guruDayJP, block.guruId).set(day, (ensureNumMap(guruDayJP, block.guruId).get(day) || 0) + block.size);
          ensureNumMap(kelasDayJP, block.kelasId).set(day, (ensureNumMap(kelasDayJP, block.kelasId).get(day) || 0) + block.size);
          ensureNumMap(guruBlocksPerDay, block.guruId).set(day, (ensureNumMap(guruBlocksPerDay, block.guruId).get(day) || 0) + 1);

          if (block.isHeavy) {
            if (!kelasHeavyDays.has(block.kelasId)) kelasHeavyDays.set(block.kelasId, new Set());
            kelasHeavyDays.get(block.kelasId)!.add(day);
          }

          const skdKey2 = `${block.subjectId}-${block.kelasId}`;
          if (!subjectKelasDay.has(skdKey2)) subjectKelasDay.set(skdKey2, new Set());
          subjectKelasDay.get(skdKey2)!.add(day);

          if (!subjectKelasJam.has(skdKey2)) subjectKelasJam.set(skdKey2, new Map());
          subjectKelasJam.get(skdKey2)!.set(day, startJam);

          // Track guru day jams for istirahat constraint
          if (!guruDayJams.has(block.guruId)) guruDayJams.set(block.guruId, new Map());
          const gdj = guruDayJams.get(block.guruId)!;
          if (!gdj.has(day)) gdj.set(day, []);
          for (let j = startJam; j < startJam + block.size; j++) gdj.get(day)!.push(j);

          block.passPlaced = pass;
          placedThisPass++;
        }

        passResults.push({ pass, label: PASS_LABELS[pass - 1] || `Pass ${pass}`, placed: placedThisPass });
        remaining = nextRemaining;

        // After last pass: try decomposing failed large blocks into smaller ones
        if (pass === PASS_COUNT && remaining.length > 0) {
          const decomposed: Block[] = [];
          const stillFailed: Block[] = [];
          for (const b of remaining) {
            const subj = subjectMap.get(b.subjectId);
            const canSplit1 = subj?.allowSingleSplit || false;
            if (b.size === 3 && canSplit1) {
              decomposed.push({ ...b, size: 2, difficulty: b.difficulty - 5 });
              decomposed.push({ ...b, size: 1, difficulty: b.difficulty - 10 });
            } else if (b.size === 2 && canSplit1) {
              decomposed.push({ ...b, size: 1, difficulty: b.difficulty - 5 });
              decomposed.push({ ...b, size: 1, difficulty: b.difficulty - 10 });
            } else {
              stillFailed.push(b);
            }
          }
          if (decomposed.length > 0) {
            let decomposedPlaced = 0;
            for (const block of decomposed) {
              const dResult = tryPlace(block, PASS_COUNT);
              if (!dResult) { block.failReason = 'no_slot'; stillFailed.push(block); continue; }
              const { day, startJam } = dResult;
              for (let j = startJam; j < startJam + block.size; j++) {
                const sk = slotKey(day, j);
                ensureSet(guruSlotsUsed, block.guruId).add(sk);
                ensureSet(kelasSlotsUsed, block.kelasId).add(sk);
                let assignedRoom: string | null = null;
                for (const room of rooms) {
                  if (!ensureSet(roomSlotsUsed, room.id).has(sk)) {
                    assignedRoom = room.id;
                    roomSlotsUsed.get(room.id)!.add(sk);
                    break;
                  }
                }
                placed.push({
                  academicYearId, semester,
                  guruId: block.guruId, kelasId: block.kelasId,
                  subjectId: block.subjectId, ruanganId: assignedRoom,
                  dayOfWeek: day, jamKe: j,
                });
              }
              ensureNumMap(guruDayJP, block.guruId).set(day, (ensureNumMap(guruDayJP, block.guruId).get(day) || 0) + block.size);
              const dskKey = `${block.subjectId}-${block.kelasId}`;
              if (!subjectKelasDay.has(dskKey)) subjectKelasDay.set(dskKey, new Set());
              subjectKelasDay.get(dskKey)!.add(day);
              decomposedPlaced++;
            }
            if (decomposedPlaced > 0) passResults.push({ pass: PASS_COUNT + 1, label: 'Decompose blok gagal', placed: decomposedPlaced });
            remaining = stillFailed;
          }
        }
      }

      for (const b of remaining) if (!b.failReason) b.failReason = 'no_slot';
      return { placed, failed: remaining, passResults };
    };

    // --- 6. Chain swap rescue ---

    const applyChainSwap = (attempt: ReturnType<typeof runAttempt>) => {
      if (attempt.failed.length === 0) return;
      const ss = attempt.placed;
      const gA = new Map<string, number>();
      const kA = new Map<string, number>();
      for (let i = 0; i < ss.length; i++) {
        gA.set(`${ss[i].guruId}-${ss[i].dayOfWeek}-${ss[i].jamKe}`, i);
        kA.set(`${ss[i].kelasId}-${ss[i].dayOfWeek}-${ss[i].jamKe}`, i);
      }
      const gFree = (g: string, d: number, j: number) => !gA.has(`${g}-${d}-${j}`);
      const kFree = (k: string, d: number, j: number) => !kA.has(`${k}-${d}-${j}`);
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
              for (let o = 1; o < block.size; o++) { if (jams[si + o] !== jams[si] + o) { con = false; break; } }
              if (!con) continue;
              const sj = jams[si];
              const ej = sj + block.size - 1;
              if (block.maxJamKe && !((config as any).afternoonExcludeFriday && day === 5) && ej > block.maxJamKe) continue;
              if (block.minJamKe && sj < block.minJamKe) continue;
              // Check subject + guru slot availability (HARD)
              let slotBlocked = false;
              for (let j = sj; j <= ej; j++) {
                if (getSubjectSlotStatus(block.subjectId, day, j) === 'unavailable') { slotBlocked = true; break; }
                if (getGuruSlotStatus(block.guruId, day, j) === 'unavailable') { slotBlocked = true; break; }
              }
              if (slotBlocked) continue;
              let cf = true;
              for (let j = sj; j < sj + block.size; j++) { if (!kFree(block.kelasId, day, j)) { cf = false; break; } }
              if (!cf) continue;
              let af = true;
              for (let j = sj; j < sj + block.size; j++) { if (!gFree(block.guruId, day, j)) { af = false; break; } }
              if (af) {
                for (let j = sj; j < sj + block.size; j++) pn(block, day, j);
                ok = true; break;
              }
              // 1-level swap for size=1 blocks
              if (block.size === 1) {
                const bi = gA.get(`${block.guruId}-${day}-${sj}`);
                if (bi === undefined) continue;
                const bSlot = ss[bi];
                let moved = false;
                for (const ad of dayList) {
                  if (guruUnavailDays.get(bSlot.guruId)?.has(ad)) continue;
                  for (const aj of availableDays.get(ad)!) {
                    if (ad === day && aj === sj) continue;
                    if (!gFree(bSlot.guruId, ad, aj) || !kFree(bSlot.kelasId, ad, aj)) continue;
                    mv(bi, ad, aj); pn(block, day, sj); ok = true; moved = true; break;
                  }
                  if (moved) break;
                }
                if (ok) break;
                // 2-level chain swap
                for (const ad of dayList) {
                  if (ok) break;
                  if (guruUnavailDays.get(bSlot.guruId)?.has(ad)) continue;
                  for (const aj of availableDays.get(ad)!) {
                    if (ad === day && aj === sj) continue;
                    if (!kFree(bSlot.kelasId, ad, aj) || gFree(bSlot.guruId, ad, aj)) continue;
                    const b2i = gA.get(`${bSlot.guruId}-${ad}-${aj}`);
                    if (b2i === undefined || b2i === bi) continue;
                    for (const ad2 of dayList) {
                      if (ok) break;
                      if (guruUnavailDays.get(ss[b2i].guruId)?.has(ad2)) continue;
                      for (const aj2 of availableDays.get(ad2)!) {
                        if (ad2 === ad && aj2 === aj) continue;
                        if (!gFree(ss[b2i].guruId, ad2, aj2) || !kFree(ss[b2i].kelasId, ad2, aj2)) continue;
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
      if (rescued > 0) attempt.passResults.push({ pass: PASS_COUNT + 2, label: `Swap rescue (${rescued} blok)`, placed: rescued });
      attempt.failed = rem;
    };

    // --- 7. Multi-attempt engine ---

    const blocksNormal = buildBlocks(false);
    const blocksAutoSplit = buildBlocks(true);
    blocksNormal.sort((a, b) => b.difficulty - a.difficulty);
    blocksAutoSplit.sort((a, b) => b.difficulty - a.difficulty);

    emit({ phase: 'scheduling', progress: 12, detail: `Attempt 1/${MAX_ATTEMPTS} -- ${blocksNormal.length} blok, mode: ${constraintMode}` });
    let bestAttempt = runAttempt([...blocksNormal]);
    applyChainSwap(bestAttempt);

    if (bestAttempt.failed.length > 0) {
      emit({ phase: 'scheduling', progress: 15, detail: `Attempt 2 (auto-split) -- ${bestAttempt.failed.length} gagal` });
      const r2 = runAttempt([...blocksAutoSplit]);
      applyChainSwap(r2);
      if (r2.failed.length < bestAttempt.failed.length) bestAttempt = r2;
    }

    for (let a = 2; a < MAX_ATTEMPTS && bestAttempt.failed.length > 0; a++) {
      if (a % 10 === 0 || a === MAX_ATTEMPTS - 1) {
        emit({
          phase: 'optimizing',
          progress: 15 + Math.round((a / MAX_ATTEMPTS) * 70),
          detail: `Attempt ${a + 1}/${MAX_ATTEMPTS} -- terbaik: ${bestAttempt.failed.length} gagal`,
        });
      }
      const base = a % 2 === 0 ? blocksAutoSplit : blocksNormal;
      const shuffled = [...base];
      // Fisher-Yates shuffle for genuine randomization per attempt
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const result = runAttempt(shuffled);
      applyChainSwap(result);
      if (result.failed.length < bestAttempt.failed.length) bestAttempt = result;
      if (bestAttempt.failed.length === 0) break;
    }

    // --- 8. Save best attempt ---

    emit({ phase: 'saving', progress: 90, detail: `Menyimpan ${bestAttempt.placed.length} slot...` });

    let newVersion: any = null;
    let versionNum = 1;
    const totalSlots = blocksNormal.reduce((s, b) => s + b.size, 0);
    const now = new Date();

    try {
      const existingVersions = await db.select().from(jadwalVersion)
        .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)));
      versionNum = existingVersions.length + 1;

      const modeLabel: Record<string, string> = { konsep: 'Konsep', relax: 'Relax', istirahat: 'Istirahat', tepat: 'Tepat' };
      const diffLabel: Record<string, string> = { normal: 'Normal', besar: 'Besar', sangat_besar: 'Sangat Besar' };
      const versionName = `Auto v${versionNum} [${modeLabel[constraintMode] || constraintMode}/${diffLabel[difficulty] || difficulty}] (${now.getDate()}/${now.getMonth() + 1})`;

      if (existingVersions.length > 0) {
        await db.update(jadwalVersion).set({ isAktif: false })
          .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)));
      }

      [newVersion] = await db.insert(jadwalVersion).values({
        academicYearId, semester, nama: versionName, isAktif: true,
        totalSlots: bestAttempt.placed.length,
        totalFailed: bestAttempt.failed.reduce((s: number, b: any) => s + b.size, 0),
        metadata: {
          passResults: bestAttempt.passResults,
          attempts: versionNum, difficulty, constraintMode,
          schedulingRulesUsed: allRules.length,
          subjectSlotsUsed: subjectSlotData.length,
          guruSlotsUsed: slotAvailData.length,
        },
      }).returning();
    } catch { /* jadwal_version table may not exist -- skip versioning */ }

    // Insert jadwal rows in batches
    if (bestAttempt.placed.length > 0) {
      const taggedSlots = bestAttempt.placed.map((p: any) => ({
        ...p, ...(newVersion ? { versionId: newVersion.id } : {}),
      }));
      for (let i = 0; i < taggedSlots.length; i += 100) {
        await db.insert(kbmJadwal).values(taggedSlots.slice(i, i + 100));
      }
    }

    emit({ phase: 'done', progress: 100, detail: 'Selesai' });

    const finalVersionName = newVersion?.nama || `Auto (${now.getDate()}/${now.getMonth() + 1})`;
    return {
      generated: bestAttempt.placed.length,
      failed: bestAttempt.failed.reduce((s: number, b: any) => s + b.size, 0),
      total: totalSlots,
      blocks: blocksNormal.length,
      failedBlocks: bestAttempt.failed.length,
      versionId: newVersion?.id || null,
      versionName: finalVersionName,
      message: `${bestAttempt.placed.length} slot berhasil (${blocksNormal.length} blok)${bestAttempt.failed.length > 0 ? `, ${bestAttempt.failed.length} blok gagal` : ''} -- ${finalVersionName}`,
      report: {
        passResults: bestAttempt.passResults,
        attempts: versionNum, difficulty, constraintMode,
        constraintsUsed: {
          schedulingRules: allRules.length,
          subjectSlotConstraints: subjectSlotData.length,
          guruSlotConstraints: slotAvailData.length,
          guruUnavailDays: unavail.length,
        },
        failedDetails: await Promise.all(bestAttempt.failed.map(async (b: any) => {
          const subj = subjectMap.get(b.subjectId);
          const kelasResult = await db.execute(sql`SELECT name FROM classes WHERE id = ${b.kelasId} LIMIT 1`);
          const kelasRow = ((kelasResult as any).rows || kelasResult)?.[0];
          const kelasName = (kelasRow as any)?.name || b.kelasId;
          return {
            subject: subj?.nama || b.subjectId, kode: subj?.kode || '?',
            size: b.size, guruId: b.guruId, kelasId: b.kelasId,
            subjectId: b.subjectId, kelasName, reason: b.failReason || 'no_slot',
          };
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

  // ═══ Import Jadwal dari Excel ════════════════════════════════

  static async importJadwal(academicYearId: string, semester: string, records: { academicYearId: string; semester: string; guruId: string; kelasId: string; subjectId: string; dayOfWeek: number; jamKe: number }[]) {
    // 1. Clear existing jadwal for this semester
    await db.delete(kbmJadwal).where(
      and(eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester))
    );

    // 2. Create new version
    let newVersion: any = null;
    const now = new Date();
    try {
      const existingVersions = await db.select().from(jadwalVersion)
        .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)));
      const versionNum = existingVersions.length + 1;
      const versionName = `Import Manual v${versionNum} (${now.getDate()}/${now.getMonth() + 1})`;

      // Deactivate existing versions
      if (existingVersions.length > 0) {
        await db.update(jadwalVersion).set({ isAktif: false })
          .where(and(eq(jadwalVersion.academicYearId, academicYearId), eq(jadwalVersion.semester, semester)));
      }

      [newVersion] = await db.insert(jadwalVersion).values({
        academicYearId, semester, nama: versionName, isAktif: true,
        totalSlots: records.length,
        totalFailed: 0,
        metadata: { source: 'excel-import', importedAt: now.toISOString() },
      }).returning();
    } catch { /* jadwal_version table may not exist -- skip versioning */ }

    // 3. Bulk insert in batches
    const taggedRecords = records.map(r => ({
      ...r, ruanganId: null, ...(newVersion ? { versionId: newVersion.id } : {}),
    }));

    for (let i = 0; i < taggedRecords.length; i += 100) {
      await db.insert(kbmJadwal).values(taggedRecords.slice(i, i + 100));
    }

    return {
      imported: records.length,
      versionName: newVersion?.nama || `Import Manual (${now.getDate()}/${now.getMonth() + 1})`,
      message: `${records.length} slot jadwal berhasil diimport`,
    };
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
      subjectId: kbmJadwal.subjectId, subjectNama: masterSubjects.nama, subjectKode: masterSubjects.kode,
      dayOfWeek: kbmJadwal.dayOfWeek, jamKe: kbmJadwal.jamKe,
    }).from(kbmJadwal)
      .leftJoin(employees, eq(kbmJadwal.guruId, employees.id))
      .leftJoin(classes, eq(kbmJadwal.kelasId, classes.id))
      .leftJoin(masterSubjects, eq(kbmJadwal.subjectId, masterSubjects.id))
      .where(and(
        eq(kbmJadwal.academicYearId, slot.academicYearId), eq(kbmJadwal.semester, slot.semester),
        eq(kbmJadwal.dayOfWeek, targetDay), eq(kbmJadwal.jamKe, targetJam),
        eq(kbmJadwal.kelasId, slot.kelasId),
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
    const heavySubjects = await db.select({ id: masterSubjects.id, nama: masterSubjects.nama }).from(masterSubjects).where(eq(masterSubjects.isHeavy, true));
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
    // Scale max penalty with schedule size so percentage is meaningful
    const maxPenalty = Math.max(jadwal.length * 0.5, 100);
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

    // Nullify jurnal_entries references to KBM-generated teaching_subjects before deletion
    // (jurnal_entries.teaching_subject_id FK has ON DELETE NO ACTION, but the column is nullable
    //  and each jurnal entry keeps its own subject_name/teacher_id/class_id, so this is safe)
    await db.execute(sql`
      UPDATE jurnal_entries
      SET teaching_subject_id = NULL
      WHERE teaching_subject_id IN (
        SELECT id FROM teaching_subjects
        WHERE kbm_generated = true
          AND semester = ${semester}
          AND tahun_ajaran = ${tahunAjaran}
      )
    `);

    // Delete only KBM-generated teaching_subjects for this semester
    await db.execute(sql`
      DELETE FROM teaching_subjects 
      WHERE kbm_generated = true 
        AND semester = ${semester}
        AND tahun_ajaran = ${tahunAjaran}
    `);

    // Insert new teaching_subjects from jadwal — GROUP consecutive same-subject same-class slots
    // Sort by day, guru, class, subject, jamKe to enable grouping
    const sorted = [...jadwal].sort((a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      (a.guruId || '').localeCompare(b.guruId || '') ||
      (a.kelasId || '').localeCompare(b.kelasId || '') ||
      (a.subjectId || '').localeCompare(b.subjectId || '') ||
      a.jamKe - b.jamKe
    );

    // Group consecutive slots: same guru + kelas + subject + day + consecutive jamKe
    const groups: { guruId: string; kelasId: string; subjectId: string | null; subjectNama: string; dayOfWeek: number; jams: number[] }[] = [];
    for (const j of sorted) {
      const last = groups[groups.length - 1];
      if (
        last &&
        last.guruId === j.guruId &&
        last.kelasId === j.kelasId &&
        last.subjectId === j.subjectId &&
        last.dayOfWeek === j.dayOfWeek &&
        j.jamKe === last.jams[last.jams.length - 1] + 1
      ) {
        last.jams.push(j.jamKe);
      } else {
        groups.push({
          guruId: j.guruId,
          kelasId: j.kelasId,
          subjectId: j.subjectId || null,
          subjectNama: j.subjectNama || '',
          dayOfWeek: j.dayOfWeek,
          jams: [j.jamKe],
        });
      }
    }

    const inserts: any[] = [];
    for (const g of groups) {
      const firstJam = g.jams[0];
      const lastJam = g.jams[g.jams.length - 1];
      const jamKeStr = g.jams.length === 1 ? String(firstJam) : `${firstJam}-${lastJam}`;
      const tsStart = timeMap.get(`${g.dayOfWeek}-${firstJam}`);
      const tsEnd = timeMap.get(`${g.dayOfWeek}-${lastJam}`);
      inserts.push({
        employeeId: g.guruId,
        classId: g.kelasId,
        subjectId: g.subjectId,
        dayOfWeek: g.dayOfWeek,
        jamKe: jamKeStr,
        waktuMulai: tsStart?.waktuMulai || null,
        waktuSelesai: tsEnd?.waktuSelesai || null,
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

  // ═══ Scheduling Rules (Aturan Jadwal) ═══════════════════════════════════════

  static async getSchedulingRules() {
    return db.select().from(schedulingRules).orderBy(desc(schedulingRules.createdAt));
  }

  static async createSchedulingRule(data: {
    ruleType: string;
    subjectIds: string[];
    classScope?: string;
    classIds?: string[] | null;
    params?: any;
    priority?: string;
    notes?: string;
  }) {
    const results = await db.insert(schedulingRules).values({
      ruleType: data.ruleType,
      subjectIds: data.subjectIds,
      classScope: data.classScope || 'all',
      classIds: data.classIds || null,
      params: data.params || null,
      priority: data.priority || 'normal',
      notes: data.notes || null,
    }).returning();
    return results[0];
  }

  static async updateSchedulingRule(id: string, data: any) {
    const results = await db.update(schedulingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schedulingRules.id, id))
      .returning();
    return results[0];
  }

  static async deleteSchedulingRule(id: string) {
    const results = await db.delete(schedulingRules).where(eq(schedulingRules.id, id)).returning();
    return results[0];
  }

  static async toggleSchedulingRule(id: string) {
    const existing = await db.select().from(schedulingRules).where(eq(schedulingRules.id, id));
    if (!existing[0]) return null;
    const results = await db.update(schedulingRules)
      .set({ isActive: !existing[0].isActive, updatedAt: new Date() })
      .where(eq(schedulingRules.id, id))
      .returning();
    return results[0];
  }
}
