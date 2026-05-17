import { db } from "../../db";
import {
  kbmSubjects, distribusiJam, tugasTambahanMaster, tugasTambahan,
  ruangan, employees, classes, academicYears, jurnalMapelCodes,
  kbmJadwal, teachingSubjects, guruUnavailability, scheduleConfig,
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

  static async getJadwal(academicYearId: string, semester: string, filters?: { kelasId?: string; guruId?: string }) {
    const conditions: any[] = [
      eq(kbmJadwal.academicYearId, academicYearId),
      eq(kbmJadwal.semester, semester),
    ];
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

  static async generateJadwal(academicYearId: string, semester: string, clearExisting = true) {
    if (clearExisting) {
      await db.delete(kbmJadwal).where(and(eq(kbmJadwal.academicYearId, academicYearId), eq(kbmJadwal.semester, semester)));
    }

    const distribusi = await db.select({ guruId: distribusiJam.guruId, kelasId: distribusiJam.kelasId, subjectId: distribusiJam.subjectId, jumlahJam: distribusiJam.jumlahJam })
      .from(distribusiJam).where(and(eq(distribusiJam.academicYearId, academicYearId), eq(distribusiJam.semester, semester)));
    if (distribusi.length === 0) return { generated: 0, failed: 0, total: 0, blocks: 0, failedBlocks: 0, message: 'Tidak ada distribusi jam', report: null };

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

    const guruTotalJP = new Map<string, number>();
    for (const d of distribusi) guruTotalJP.set(d.guruId, (guruTotalJP.get(d.guruId) || 0) + d.jumlahJam);

    // Expand distribusi into blocks
    interface Block { guruId: string; kelasId: string; subjectId: string; size: number; isHeavy: boolean; maxJamKe: number | null; difficulty: number; failReason?: string; passPlaced?: number; }
    const blocks: Block[] = [];
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
      if (allowSingle && jp === 3 && blockSizes.length === 1 && blockSizes[0] === 3) blockSizes = [2, 1];
      const guruUnavailCount = guruUnavailDays.get(d.guruId)?.size || 0;
      for (const size of blockSizes) {
        const difficulty = size * 10 + (isHeavy ? 50 : 0) + (maxJamKe ? 30 : 0) + guruUnavailCount * 15 + (guruTotalJP.get(d.guruId)! > 20 ? 20 : 0);
        blocks.push({ guruId: d.guruId, kelasId: d.kelasId, subjectId: d.subjectId, size, isHeavy, maxJamKe, difficulty });
      }
    }
    blocks.sort((a, b) => b.difficulty - a.difficulty);

    // Placement state
    const slotKey = (day: number, jam: number) => `${day}-${jam}`;
    const guruSlots = new Map<string, Set<string>>();
    const kelasSlots = new Map<string, Set<string>>();
    const roomSlots = new Map<string, Set<string>>();
    const guruDayJP = new Map<string, Map<number, number>>();
    const kelasHeavyDays = new Map<string, Set<number>>();
    const kelasDayJP = new Map<string, Map<number, number>>();
    const ensureSet = (map: Map<string, Set<string>>, key: string) => { if (!map.has(key)) map.set(key, new Set()); return map.get(key)!; };
    const ensureMap = (map: Map<string, Map<number, number>>, key: string) => { if (!map.has(key)) map.set(key, new Map()); return map.get(key)!; };
    const dayList = Array.from(availableDays.keys()).sort((a, b) => a - b);
    const toInsert: any[] = [];
    const passResults: { pass: number; label: string; placed: number }[] = [];
    const PASS_LABELS = ['Strict (semua constraint)', 'Relax distribusi merata', 'Relax afternoon + daily limit', 'Relax heavy separation', 'Force (hard constraint only)'];

    // Slot scoring + constraint-aware placement
    const tryPlaceBlock = (block: Block, passLevel: number): { day: number; startJam: number } | null => {
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
        const enforceAfternoon = afternoonApplies && (block.isHeavy ? passLevel < 5 : passLevel < 3);
        const activeDays = dayList.filter(d => !guruUnavailDays.get(block.guruId)?.has(d)).length;
        const targetPerDay = activeDays > 0 ? Math.ceil(totalJP / activeDays) : 99;
        const currentGuruDayJP = ensureMap(guruDayJP, block.guruId).get(day) || 0;
        const isOverloaded = passLevel < 2 && currentGuruDayJP >= Math.ceil(targetPerDay * 1.5);

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
          // Score
          let score = 100;
          if (block.isHeavy) score += (10 - startJam) * 3;
          score -= currentGuruDayJP * 8;
          score -= (ensureMap(kelasDayJP, block.kelasId).get(day) || 0) * 2;
          if (isOverloaded) score -= 50;
          if (kelasHeavyDays.get(block.kelasId)?.has(day)) score -= 20;
          if (!best || score > best.score) best = { day, startJam, score };
        }
      }
      return best;
    };

    // Multi-pass placement
    let remaining = [...blocks];
    for (let pass = 1; pass <= 5; pass++) {
      if (remaining.length === 0) break;
      const nextRemaining: Block[] = [];
      let placedThisPass = 0;
      for (const block of remaining) {
        const result = tryPlaceBlock(block, pass);
        if (!result) {
          if (pass === 5) block.failReason = 'no_slot';
          nextRemaining.push(block);
          continue;
        }
        const { day, startJam } = result;
        for (let j = startJam; j < startJam + block.size; j++) {
          const sk = slotKey(day, j);
          ensureSet(guruSlots, block.guruId).add(sk);
          ensureSet(kelasSlots, block.kelasId).add(sk);
          let assignedRoom: string | null = null;
          for (const room of rooms) { if (!ensureSet(roomSlots, room.id).has(sk)) { assignedRoom = room.id; roomSlots.get(room.id)!.add(sk); break; } }
          toInsert.push({ academicYearId, semester, guruId: block.guruId, kelasId: block.kelasId, subjectId: block.subjectId, ruanganId: assignedRoom, dayOfWeek: day, jamKe: j });
        }
        ensureMap(guruDayJP, block.guruId).set(day, (ensureMap(guruDayJP, block.guruId).get(day) || 0) + block.size);
        ensureMap(kelasDayJP, block.kelasId).set(day, (ensureMap(kelasDayJP, block.kelasId).get(day) || 0) + block.size);
        if (block.isHeavy) { if (!kelasHeavyDays.has(block.kelasId)) kelasHeavyDays.set(block.kelasId, new Set()); kelasHeavyDays.get(block.kelasId)!.add(day); }
        block.passPlaced = pass;
        placedThisPass++;
      }
      passResults.push({ pass, label: PASS_LABELS[pass - 1], placed: placedThisPass });
      remaining = nextRemaining;
    }

    // Bulk insert
    if (toInsert.length > 0) { for (let i = 0; i < toInsert.length; i += 100) { await db.insert(kbmJadwal).values(toInsert.slice(i, i + 100)); } }

    const failedBlocks = remaining;
    const totalSlots = blocks.reduce((s, b) => s + b.size, 0);
    return {
      generated: toInsert.length, failed: failedBlocks.reduce((s, b) => s + b.size, 0), total: totalSlots,
      blocks: blocks.length, failedBlocks: failedBlocks.length,
      message: `${toInsert.length} slot berhasil (${blocks.length} blok)${failedBlocks.length > 0 ? `, ${failedBlocks.length} blok gagal` : ''}`,
      report: {
        passResults,
        failedDetails: failedBlocks.map(b => {
          const subj = subjectMap.get(b.subjectId);
          return { subject: subj?.nama || b.subjectId, kode: subj?.kode || '?', size: b.size, guruId: b.guruId, kelasId: b.kelasId, reason: b.failReason || 'no_slot' };
        }),
      },
    };
  }

  static async moveSlot(id: string, dayOfWeek: number, jamKe: number, ruanganId?: string) {
    const [slot] = await db.select().from(kbmJadwal).where(eq(kbmJadwal.id, id));
    if (!slot) throw new Error('Slot tidak ditemukan');

    // Check conflicts at new position
    const sk = `${dayOfWeek}-${jamKe}`;
    const conflicts = await db.select({ id: kbmJadwal.id }).from(kbmJadwal).where(and(
      eq(kbmJadwal.academicYearId, slot.academicYearId),
      eq(kbmJadwal.semester, slot.semester),
      eq(kbmJadwal.dayOfWeek, dayOfWeek),
      eq(kbmJadwal.jamKe, jamKe),
      sql`(${kbmJadwal.guruId} = ${slot.guruId} OR ${kbmJadwal.kelasId} = ${slot.kelasId})`,
      sql`${kbmJadwal.id} != ${id}`,
    ));

    if (conflicts.length > 0) throw new Error('Konflik: guru atau kelas sudah terisi di slot tujuan');

    const updateData: any = { dayOfWeek, jamKe, updatedAt: new Date() };
    if (ruanganId !== undefined) updateData.ruanganId = ruanganId || null;

    const [updated] = await db.update(kbmJadwal).set(updateData).where(eq(kbmJadwal.id, id)).returning();
    return updated;
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
