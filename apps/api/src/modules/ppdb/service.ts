import { db } from '../../db';
import { 
  ppdbConfig, ppdbJalur, ppdbPendaftar, ppdbDataDiri, 
  ppdbDataSekolah, ppdbNilaiRaport, ppdbPrestasi, ppdbDokumen, ppdbDaftarUlang,
  siteSettings
} from '../../db/schema';
import { eq, and, desc, asc, ilike, or, sql, count } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

export class PPDBService {

  // ============ PUBLIC: Config & Jalur ============

  /** Get active SIMPMB configuration with active jalur only */
  static async getPublicConfig() {
    const configs = await db.select().from(ppdbConfig).where(eq(ppdbConfig.isActive, true)).limit(1);
    if (configs.length === 0) return null;
    const config = configs[0];

    // Only return jalur that admin has activated
    const rawJalurList = await db.select().from(ppdbJalur)
      .where(and(eq(ppdbJalur.configId, config.id), eq(ppdbJalur.isActive, true)))
      .orderBy(asc(ppdbJalur.namaJalur));

    // Deduplicate by name gracefully
    const jalurList = Array.from(new Map(rawJalurList.map(j => [j.namaJalur.toLowerCase(), j])).values());

    // Count pendaftar per jalur
    const jalurWithCounts = await Promise.all(jalurList.map(async (j) => {
      const result = await db.select({ count: count() }).from(ppdbPendaftar).where(eq(ppdbPendaftar.jalurId, j.id));
      return { ...j, jumlahPendaftar: result[0]?.count || 0 };
    }));

    // Fetch brosur URL and kontak panitia from site_settings
    const settings = await db.select().from(siteSettings).where(or(eq(siteSettings.key, 'ppdb_brosur_url'), eq(siteSettings.key, 'ppdb_kontak_panitia')));
    const brosurUrl = settings.find((s: any) => s.key === 'ppdb_brosur_url')?.value || null;
    const rawKontak = settings.find((s: any) => s.key === 'ppdb_kontak_panitia')?.value;
    let kontakPanitia = [];
    try { if (rawKontak) kontakPanitia = JSON.parse(rawKontak); } catch (e) {}

    return { ...config, jalur: jalurWithCounts, brosurUrl, kontakPanitia };
  }

  /** Save brosur URL to site_settings */
  static async saveBrosurUrl(url: string) {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, 'ppdb_brosur_url')).limit(1);
    if (existing.length > 0) {
      await db.update(siteSettings)
        .set({ value: url, updatedAt: new Date() })
        .where(eq(siteSettings.key, 'ppdb_brosur_url'));
    } else {
      await db.insert(siteSettings).values({
        key: 'ppdb_brosur_url',
        value: url,
        group: 'ppdb',
      });
    }
    return { brosurUrl: url };
  }

  /** Get active jalur list (public) */
  static async getActiveJalur() {
    const configs = await db.select().from(ppdbConfig).where(eq(ppdbConfig.isActive, true)).limit(1);
    if (configs.length === 0) return [];
    
    // Only return active jalur directly linked
    const jalurList = await db.select().from(ppdbJalur)
      .where(and(eq(ppdbJalur.configId, configs[0].id), eq(ppdbJalur.isActive, true)))
      .orderBy(asc(ppdbJalur.namaJalur));

    // Deduplicate by name gracefully (in case DB hasn't been cleaned up yet)
    return Array.from(new Map(jalurList.map(j => [j.namaJalur.toLowerCase(), j])).values());
  }

  // ============ PUBLIC: Pendaftaran ============

  /** Generate nomor pendaftaran: MND2604MTS0101001 */
  static async generateNoPendaftaran(params: {
    namaSekolah: string;
    statusSekolah: string;
    jenisKelamin: string;
  }): Promise<string> {
    const result = await db.select({ count: count() }).from(ppdbPendaftar);
    const nextNum = (result[0]?.count || 0) + 1;
    
    const prefix = 'MND';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    
    let kodesekolah = 'MTS'; // Default
    const namaUpper = params.namaSekolah ? params.namaSekolah.toUpperCase() : '';
    if (namaUpper.includes('SMP')) {
      kodesekolah = 'SMP';
    } else if (namaUpper.includes('MTS') || namaUpper.includes('TSANAWIYAH')) {
      kodesekolah = 'MTS';
    }
    
    const statusSekolahKode = (params.statusSekolah || '').toLowerCase() === 'swasta' ? '02' : '01';
    const genderKode = (params.jenisKelamin || '').toLowerCase() === 'perempuan' ? '02' : '01';
    
    const seq = String(nextNum).padStart(3, '0');
    
    return `${prefix}${yy}${mm}${kodesekolah}${statusSekolahKode}${genderKode}${seq}`;
  }

  /** Submit pendaftaran lengkap (single transaction-like call) */
  static async submitPendaftaran(data: {
    jalurId: string;
    dataDiri: any;
    dataSekolah: any;
    nilaiRaport: any[];
    prestasi?: any[];
    dokumen?: any[];
  }) {
    // 1. Validate jalur exists and is active
    const jalurList = await db.select().from(ppdbJalur).where(eq(ppdbJalur.id, data.jalurId));
    if (jalurList.length === 0) throw new Error('Jalur pendaftaran tidak ditemukan');
    const jalur = jalurList[0];
    if (!jalur.isActive) throw new Error('Jalur pendaftaran tidak aktif');

    // Check jadwal
    const now = new Date();
    if (jalur.jadwalBuka && now < new Date(jalur.jadwalBuka)) {
      throw new Error('Pendaftaran belum dibuka');
    }
    if (jalur.jadwalTutup && now > new Date(jalur.jadwalTutup)) {
      throw new Error('Pendaftaran sudah ditutup');
    }

    // Check kuota
    const pendaftarCount = await db.select({ count: count() }).from(ppdbPendaftar).where(eq(ppdbPendaftar.jalurId, data.jalurId));
    // Don't block by kuota — kuota is for selection, not registration

    // Check duplicate NISN in same jalur
    const existingNISN = await db.select().from(ppdbPendaftar)
      .where(and(eq(ppdbPendaftar.nisn, data.dataDiri.nisn), eq(ppdbPendaftar.jalurId, data.jalurId)));
    if (existingNISN.length > 0) {
      throw new Error('NISN sudah terdaftar di jalur ini');
    }

    // Calculate average from nilai
    let rataRataAkhir = 0;
    if (data.nilaiRaport && data.nilaiRaport.length > 0) {
      const avgPerSemester = data.nilaiRaport.map((sem: any) => {
        const vals = [sem.bIndonesia, sem.bInggris, sem.matematika, sem.ipa, sem.ips]
          .map(Number).filter(v => !isNaN(v) && v > 0);
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      });
      const validAvgs = avgPerSemester.filter((v: number) => v > 0);
      rataRataAkhir = validAvgs.length > 0 ? validAvgs.reduce((a: number, b: number) => a + b, 0) / validAvgs.length : 0;
    }

    // Validate minimum score
    if (jalur.nilaiMinimum && rataRataAkhir < jalur.nilaiMinimum) {
      throw new Error(`Rata-rata nilai (${rataRataAkhir.toFixed(2)}) di bawah minimum (${jalur.nilaiMinimum}) untuk jalur ${jalur.namaJalur}`);
    }

    // Validate prestasi required
    if (jalur.requiresPrestasi && (!data.prestasi || data.prestasi.length === 0)) {
      throw new Error('Jalur Prestasi memerlukan minimal 1 sertifikat prestasi');
    }

    // 2. Create pendaftar
    const noPendaftaran = await this.generateNoPendaftaran({
      namaSekolah: data.dataSekolah.namaSekolah,
      statusSekolah: data.dataSekolah.statusSekolah,
      jenisKelamin: data.dataDiri.jenisKelamin,
    });
    const [pendaftar] = await db.insert(ppdbPendaftar).values({
      jalurId: data.jalurId,
      noPendaftaran,
      nisn: data.dataDiri.nisn,
      email: data.dataDiri.email || null,
      status: 'menunggu',
      nilaiAkhir: rataRataAkhir.toFixed(2),
    }).returning();

    // 3. Insert data diri
    await db.insert(ppdbDataDiri).values({
      pendaftarId: pendaftar.id,
      nik: data.dataDiri.nik,
      namaLengkap: data.dataDiri.namaLengkap,
      tempatLahir: data.dataDiri.tempatLahir,
      tanggalLahir: data.dataDiri.tanggalLahir,
      jenisKelamin: data.dataDiri.jenisKelamin,
      alamat: data.dataDiri.alamat,
      namaAyah: data.dataDiri.namaAyah || null,
      pekerjaanAyah: data.dataDiri.pekerjaanAyah || null,
      namaIbu: data.dataDiri.namaIbu || null,
      pekerjaanIbu: data.dataDiri.pekerjaanIbu || null,
      noHpOrtu: data.dataDiri.noHpOrtu,
    });

    // 4. Insert data sekolah
    await db.insert(ppdbDataSekolah).values({
      pendaftarId: pendaftar.id,
      npsn: data.dataSekolah.npsn || null,
      namaSekolah: data.dataSekolah.namaSekolah,
      statusSekolah: data.dataSekolah.statusSekolah,
      alamatSekolah: data.dataSekolah.alamatSekolah || null,
      tahunLulus: data.dataSekolah.tahunLulus,
    });

    // 5. Insert nilai raport (multiple semesters)
    for (const nilai of data.nilaiRaport) {
      const vals = [nilai.bIndonesia, nilai.bInggris, nilai.matematika, nilai.ipa, nilai.ips]
        .map(Number).filter(v => !isNaN(v) && v > 0);
      const avg = vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '0';

      await db.insert(ppdbNilaiRaport).values({
        pendaftarId: pendaftar.id,
        semester: nilai.semester,
        bIndonesia: nilai.bIndonesia || null,
        bInggris: nilai.bInggris || null,
        matematika: nilai.matematika || null,
        ipa: nilai.ipa || null,
        ips: nilai.ips || null,
        rataRata: avg,
      });
    }

    // 6. Insert prestasi (optional)
    if (data.prestasi && data.prestasi.length > 0) {
      for (const p of data.prestasi) {
        await db.insert(ppdbPrestasi).values({
          pendaftarId: pendaftar.id,
          jenis: p.jenis,
          tingkat: p.tingkat,
          namaKegiatan: p.namaKegiatan,
          peringkat: p.peringkat || null,
          tahun: p.tahun || null,
          fileSertifikat: p.fileSertifikat || null,
        });
      }
    }

    // 7. Insert dokumen (optional)
    if (data.dokumen && data.dokumen.length > 0) {
      for (const d of data.dokumen) {
        await db.insert(ppdbDokumen).values({
          pendaftarId: pendaftar.id,
          jenisDokumen: d.jenisDokumen,
          filePath: d.filePath,
        });
      }
    }

    return {
      id: pendaftar.id,
      noPendaftaran: pendaftar.noPendaftaran,
      nisn: pendaftar.nisn,
      status: pendaftar.status,
      nilaiAkhir: rataRataAkhir.toFixed(2),
    };
  }

  /** Upload file for PPDB (certificates, documents) */
  static async uploadFile(file: Express.Multer.File, subdir: string = 'ppdb'): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', subdir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/${subdir}/${filename}`;
  }

  // ============ PUBLIC: Status Check ============

  /** Check registration status by NISN + noPendaftaran */
  static async checkStatus(nisn: string, noPendaftaran: string) {
    const results = await db.select().from(ppdbPendaftar)
      .where(and(eq(ppdbPendaftar.nisn, nisn), eq(ppdbPendaftar.noPendaftaran, noPendaftaran)));
    
    if (results.length === 0) return null;
    const pendaftar = results[0];

    // Get related data
    const dataDiri = await db.select().from(ppdbDataDiri).where(eq(ppdbDataDiri.pendaftarId, pendaftar.id));
    const jalurData = await db.select().from(ppdbJalur).where(eq(ppdbJalur.id, pendaftar.jalurId));

    const config = await db.select().from(ppdbConfig).limit(1);
    const pengumuman = config[0]?.tanggalPengumuman ? new Date(config[0].tanggalPengumuman) : null;
    let finalStatus = pendaftar.status;

    // Mask status if not yet announcement time AND the status is final (diterima/ditolak/cadangan)
    if (pengumuman && new Date() < pengumuman) {
      if (pendaftar.status && ['diterima', 'ditolak', 'cadangan'].includes(pendaftar.status)) {
        finalStatus = 'menunggu_pengumuman';
      }
    }

    return {
      ...pendaftar,
      status: finalStatus,
      realStatus: pendaftar.status, // Internal use
      dataDiri: dataDiri[0] || null,
      jalur: jalurData[0] || null,
    };
  }

  // ============ ADMIN: Stats ============

  /** Dashboard statistics */
  static async getAdminStats() {
    const configs = await db.select().from(ppdbConfig).where(eq(ppdbConfig.isActive, true)).limit(1);
    if (configs.length === 0) return { totalPendaftar: 0, jalurStats: [], statusStats: {} };
    const config = configs[0];

    const rawAllJalur = await db.select().from(ppdbJalur).where(eq(ppdbJalur.configId, config.id));
    const allJalur = Array.from(new Map(rawAllJalur.map(j => [j.namaJalur.toLowerCase(), j])).values());

    const jalurStats = await Promise.all(allJalur.map(async (j) => {
      const totalResult = await db.select({ count: count() }).from(ppdbPendaftar).where(eq(ppdbPendaftar.jalurId, j.id));
      
      const statusCounts: Record<string, number> = {};
      for (const status of ['menunggu', 'terverifikasi', 'diterima', 'ditolak', 'cadangan']) {
        const r = await db.select({ count: count() }).from(ppdbPendaftar)
          .where(and(eq(ppdbPendaftar.jalurId, j.id), eq(ppdbPendaftar.status, status)));
        statusCounts[status] = r[0]?.count || 0;
      }

      return {
        id: j.id,
        namaJalur: j.namaJalur,
        kuota: j.kuota,
        isActive: j.isActive,
        jadwalBuka: j.jadwalBuka,
        jadwalTutup: j.jadwalTutup,
        totalPendaftar: totalResult[0]?.count || 0,
        ...statusCounts,
      };
    }));

    const totalResult = await db.select({ count: count() }).from(ppdbPendaftar)
      .innerJoin(ppdbJalur, eq(ppdbPendaftar.jalurId, ppdbJalur.id))
      .where(eq(ppdbJalur.configId, config.id));

    // Fetch brosur URL and kontak panitia from site_settings (needed by admin frontend preview/edit)
    const settings = await db.select().from(siteSettings).where(or(eq(siteSettings.key, 'ppdb_brosur_url'), eq(siteSettings.key, 'ppdb_kontak_panitia')));
    const brosurUrl = settings.find((s: any) => s.key === 'ppdb_brosur_url')?.value || null;
    const rawKontak = settings.find((s: any) => s.key === 'ppdb_kontak_panitia')?.value;
    let kontakPanitia = [];
    try { if (rawKontak) kontakPanitia = JSON.parse(rawKontak); } catch (e) {}

    return {
      config: { ...config, brosurUrl, kontakPanitia },
      totalPendaftar: totalResult[0]?.count || 0,
      jalurStats,
    };
  }

  // ============ ADMIN: Pendaftar Management ============

  /** List pendaftar with filters and pagination */
  static async listPendaftar(params: {
    jalurId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { jalurId, status, search, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions: any[] = [];
    if (jalurId) conditions.push(eq(ppdbPendaftar.jalurId, jalurId));
    if (status) conditions.push(eq(ppdbPendaftar.status, status));

    // Base query with join to data_diri for name search
    let query = db.select({
      pendaftar: ppdbPendaftar,
      dataDiri: ppdbDataDiri,
      jalur: ppdbJalur,
    })
    .from(ppdbPendaftar)
    .leftJoin(ppdbDataDiri, eq(ppdbDataDiri.pendaftarId, ppdbPendaftar.id))
    .leftJoin(ppdbJalur, eq(ppdbJalur.id, ppdbPendaftar.jalurId));

    if (search) {
      conditions.push(
        or(
          ilike(ppdbDataDiri.namaLengkap, `%${search}%`),
          ilike(ppdbPendaftar.nisn, `%${search}%`),
          ilike(ppdbPendaftar.noPendaftaran, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await (whereClause 
      ? (query as any).where(whereClause).orderBy(desc(ppdbPendaftar.tglDaftar)).limit(limit).offset(offset)
      : (query as any).orderBy(desc(ppdbPendaftar.tglDaftar)).limit(limit).offset(offset)
    );

    // Count total
    let countQuery = db.select({ count: count() }).from(ppdbPendaftar)
      .leftJoin(ppdbDataDiri, eq(ppdbDataDiri.pendaftarId, ppdbPendaftar.id));
    
    const totalResult = whereClause 
      ? await (countQuery as any).where(whereClause)
      : await countQuery;

    return {
      data: data.map((row: any) => ({
        ...row.pendaftar,
        nama: row.dataDiri?.namaLengkap || '-',
        jalurNama: row.jalur?.namaJalur || '-',
      })),
      total: totalResult[0]?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
    };
  }

  /** Get full detail of a pendaftar */
  static async getPendaftarDetail(id: string) {
    const pendaftarList = await db.select().from(ppdbPendaftar).where(eq(ppdbPendaftar.id, id));
    if (pendaftarList.length === 0) return null;
    const pendaftar = pendaftarList[0];

    const [dataDiri, dataSekolah, nilaiRaport, prestasi, dokumen, jalur, daftarUlang] = await Promise.all([
      db.select().from(ppdbDataDiri).where(eq(ppdbDataDiri.pendaftarId, id)),
      db.select().from(ppdbDataSekolah).where(eq(ppdbDataSekolah.pendaftarId, id)),
      db.select().from(ppdbNilaiRaport).where(eq(ppdbNilaiRaport.pendaftarId, id)).orderBy(asc(ppdbNilaiRaport.semester)),
      db.select().from(ppdbPrestasi).where(eq(ppdbPrestasi.pendaftarId, id)),
      db.select().from(ppdbDokumen).where(eq(ppdbDokumen.pendaftarId, id)),
      db.select().from(ppdbJalur).where(eq(ppdbJalur.id, pendaftar.jalurId)),
      db.select().from(ppdbDaftarUlang).where(eq(ppdbDaftarUlang.pendaftarId, id)),
    ]);

    return {
      ...pendaftar,
      dataDiri: dataDiri[0] || null,
      dataSekolah: dataSekolah[0] || null,
      nilaiRaport,
      prestasi,
      dokumen,
      jalur: jalur[0] || null,
      daftarUlang: daftarUlang[0] || null,
    };
  }

  /** Update pendaftar status (verifikasi / tolak) */
  static async updatePendaftarStatus(id: string, data: { status: string; catatanAdmin?: string }) {
    const [updated] = await db.update(ppdbPendaftar)
      .set({
        status: data.status,
        catatanAdmin: data.catatanAdmin || null,
        updatedAt: new Date(),
      })
      .where(eq(ppdbPendaftar.id, id))
      .returning();
    return updated;
  }

  /** Update daftar ulang status (sudah_validasi / revisi) */
  static async updateDaftarUlangStatus(id: string, status: string) {
    const [updated] = await db.update(ppdbDaftarUlang)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(ppdbDaftarUlang.id, id))
      .returning();
    return updated;
  }

  // ============ ADMIN: Jalur Configuration ============

  /** Get all jalur (including inactive) for admin */
  static async getAllJalurAdmin() {
    const configs = await db.select().from(ppdbConfig).where(eq(ppdbConfig.isActive, true)).limit(1);
    if (configs.length === 0) return [];
    
    const rawJalur = await db.select().from(ppdbJalur)
      .where(eq(ppdbJalur.configId, configs[0].id))
      .orderBy(asc(ppdbJalur.namaJalur));
      
    return Array.from(new Map(rawJalur.map(j => [j.namaJalur.toLowerCase(), j])).values());
  }

  /** Update jalur configuration */
  static async updateJalur(id: string, data: any) {
    const [updated] = await db.update(ppdbJalur)
      .set({
        kuota: data.kuota !== undefined ? data.kuota : undefined,
        nilaiMinimum: data.nilaiMinimum !== undefined ? data.nilaiMinimum : undefined,
        jadwalBuka: data.jadwalBuka ? new Date(data.jadwalBuka) : null,
        jadwalTutup: data.jadwalTutup ? new Date(data.jadwalTutup) : null,
        persyaratan: data.persyaratan || undefined,
        deskripsi: data.deskripsi || undefined,
        bobotNilai: data.bobotNilai !== undefined ? data.bobotNilai : undefined,
        bobotPrestasi: data.bobotPrestasi !== undefined ? data.bobotPrestasi : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(ppdbJalur.id, id))
      .returning();
    return updated;
  }

  // ============ ADMIN: Config & Selection (Batch 2) ============

  /** Update PPDB System Configuration (Tanggal Pengumuman, etc) */
  static async updateConfig(id: string, data: { 
    tahunAjaran?: string; isActive?: boolean; tanggalPengumuman?: string | null; 
    batasDaftarUlang?: string | null; nomorSk?: string | null; namaSk?: string | null;
    kontakPanitia?: any[]; 
  }) {
    const [updated] = await db.update(ppdbConfig)
      .set({
        tahunAjaran: data.tahunAjaran,
        isActive: data.isActive,
        tanggalPengumuman: data.tanggalPengumuman ? new Date(data.tanggalPengumuman) : null,
        batasDaftarUlang: data.batasDaftarUlang ? new Date(data.batasDaftarUlang) : null,
        nomorSk: data.nomorSk !== undefined ? (data.nomorSk || null) : undefined,
        namaSk: data.namaSk !== undefined ? (data.namaSk || null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(ppdbConfig.id, id))
      .returning();

    // Handle kontakPanitia update in site_settings
    if (data.kontakPanitia !== undefined) {
      const kontakStr = JSON.stringify(data.kontakPanitia);
      const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, 'ppdb_kontak_panitia')).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettings).set({ value: kontakStr, updatedAt: new Date() }).where(eq(siteSettings.key, 'ppdb_kontak_panitia'));
      } else {
        await db.insert(siteSettings).values({ key: 'ppdb_kontak_panitia', value: kontakStr, group: 'ppdb' });
      }
    }

    return updated;
  }

  /** Calculate and Generate Ranking for all verified Pendaftar in a Jalur */
  static async generateRanking(jalurId: string) {
    const jalurData = await db.select().from(ppdbJalur).where(eq(ppdbJalur.id, jalurId));
    if (jalurData.length === 0) throw new Error('Jalur tidak ditemukan');
    const jalur = jalurData[0];

    // Get all verified/accepted candidates
    const candidates = await db.select().from(ppdbPendaftar)
      .where(and(
        eq(ppdbPendaftar.jalurId, jalurId),
        or(eq(ppdbPendaftar.status, 'terverifikasi'), eq(ppdbPendaftar.status, 'diterima'), eq(ppdbPendaftar.status, 'cadangan'))
      ));

    // Calculate final true score based on bobot
    const scoredCandidates = await Promise.all(candidates.map(async (c) => {
      // Base score is nilaiAkhir
      const baseScore = parseFloat(c.nilaiAkhir || '0');
      
      // Calculate prestasi score loosely (count certificates or level)
      // Just a simple approximation since real ranking is complex. Let's say Internasional = +100, Nasional=+80, Provinsi=+60, Kabupaten=+40
      const prestasiList = await db.select().from(ppdbPrestasi).where(eq(ppdbPrestasi.pendaftarId, c.id));
      let prestasiScore = 0;
      for (const p of prestasiList) {
        if (p.tingkat?.toLowerCase() === 'internasional') prestasiScore += 100;
        else if (p.tingkat?.toLowerCase() === 'nasional') prestasiScore += 80;
        else if (p.tingkat?.toLowerCase() === 'provinsi') prestasiScore += 60;
        else if (p.tingkat?.toLowerCase() === 'kabupaten') prestasiScore += 40;
        else prestasiScore += 20; // Default
      }
      // Cap prestasiScore to 100
      prestasiScore = Math.min(prestasiScore, 100);

      const bobotNilai = jalur.bobotNilai || 100;
      const bobotPrestasi = jalur.bobotPrestasi || 0;

      const finalScore = ((baseScore * bobotNilai) + (prestasiScore * bobotPrestasi)) / (bobotNilai + bobotPrestasi);

      return {
        id: c.id,
        rawScore: baseScore,
        prestasiScore,
        finalScore,
      };
    }));

    // Sort descending by finalScore
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    // Update Rankings
    for (let i = 0; i < scoredCandidates.length; i++) {
      await db.update(ppdbPendaftar)
        .set({ ranking: i + 1 })
        .where(eq(ppdbPendaftar.id, scoredCandidates[i].id));
    }

    return { totalRanked: scoredCandidates.length };
  }

  /** Bulk update acceptance based on ranking and quota */
  static async tetapkanKelulusan(jalurId: string) {
    const jalurData = await db.select().from(ppdbJalur).where(eq(ppdbJalur.id, jalurId));
    if (jalurData.length === 0) throw new Error('Jalur tidak ditemukan');
    const jalur = jalurData[0];
    const quota = jalur.kuota || 0;

    // Get all ranked candidates
    const ranked = await db.select().from(ppdbPendaftar)
      .where(and(
        eq(ppdbPendaftar.jalurId, jalurId),
        sql`${ppdbPendaftar.ranking} IS NOT NULL`
      ))
      .orderBy(asc(ppdbPendaftar.ranking));

    let acceptedCount = 0;
    const year = new Date().getFullYear();
    
    // Process acceptance
    for (const p of ranked) {
      if (p.status === 'ditolak') continue; // Skip already rejected explicitly
      
      let newStatus = 'cadangan';
      if (acceptedCount < quota) {
        newStatus = 'diterima';
        acceptedCount++;
      } else {
        newStatus = 'cadangan';
      }

      // Generate unique validation code for accepted students
      let validationCode = p.validationCode;
      if (newStatus === 'diterima' && !validationCode) {
        const rand = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        const checksum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        validationCode = `AUTH-VLD-${year}-M2LT-${rand}-${checksum}`;
      }

      await db.update(ppdbPendaftar)
        .set({ status: newStatus, validationCode: validationCode || null, updatedAt: new Date() })
        .where(eq(ppdbPendaftar.id, p.id));
    }

    return { updated: ranked.length, accepted: acceptedCount };
  }

  // ============ ADMIN: Export ============

  /** Export pendaftar data for Excel */
  static async exportPendaftar(jalurId?: string) {
    const conditions: any[] = [];
    if (jalurId) conditions.push(eq(ppdbPendaftar.jalurId, jalurId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db.select({
      pendaftar: ppdbPendaftar,
      dataDiri: ppdbDataDiri,
      dataSekolah: ppdbDataSekolah,
      jalur: ppdbJalur,
    })
    .from(ppdbPendaftar)
    .leftJoin(ppdbDataDiri, eq(ppdbDataDiri.pendaftarId, ppdbPendaftar.id))
    .leftJoin(ppdbDataSekolah, eq(ppdbDataSekolah.pendaftarId, ppdbPendaftar.id))
    .leftJoin(ppdbJalur, eq(ppdbJalur.id, ppdbPendaftar.jalurId))
    .orderBy(asc(ppdbPendaftar.noPendaftaran));

    return whereClause ? (query as any).where(whereClause) : query;
  }

  static async listDaftarUlangAdmin(params: { search?: string, page?: number, limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    
    let query = db.select({
      pendaftar: ppdbPendaftar,
      dataDiri: ppdbDataDiri,
      dataSekolah: ppdbDataSekolah,
      daftarUlang: ppdbDaftarUlang,
    })
    .from(ppdbDaftarUlang)
    .innerJoin(ppdbPendaftar, eq(ppdbPendaftar.id, ppdbDaftarUlang.pendaftarId))
    .leftJoin(ppdbDataDiri, eq(ppdbDataDiri.pendaftarId, ppdbPendaftar.id))
    .leftJoin(ppdbDataSekolah, eq(ppdbDataSekolah.pendaftarId, ppdbPendaftar.id));

    if (search) {
      conditions.push(
        or(
          ilike(ppdbDataDiri.namaLengkap, `%${search}%`),
          ilike(ppdbPendaftar.nisn, `%${search}%`),
          ilike(ppdbPendaftar.noPendaftaran, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await (whereClause 
      ? (query as any).where(whereClause).orderBy(desc(ppdbDaftarUlang.updatedAt)).limit(limit).offset(offset)
      : (query as any).orderBy(desc(ppdbDaftarUlang.updatedAt)).limit(limit).offset(offset)
    );

    let countQuery = db.select({ count: count() }).from(ppdbDaftarUlang)
      .innerJoin(ppdbPendaftar, eq(ppdbPendaftar.id, ppdbDaftarUlang.pendaftarId))
      .leftJoin(ppdbDataDiri, eq(ppdbDataDiri.pendaftarId, ppdbPendaftar.id));
    
    const totalResult = whereClause 
      ? await (countQuery as any).where(whereClause)
      : await countQuery;

    return {
      data: data.map((row: any) => ({
        ...row.pendaftar,
        nama: row.dataDiri?.namaLengkap || '-',
        daftarUlangStatus: row.daftarUlang?.status || '-',
        validationCode: row.pendaftar?.validationCode || null,
      })),
      total: totalResult[0]?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
    };
  }

  // ============ PUBLIC: Daftar Ulang ============

  static async submitDaftarUlang(noPendaftaran: string, data: {
    buktiPembayaranUrl?: string;
    ijazahUrl?: string;
    kkUrl?: string;
    kipUrl?: string;
    photoUrl?: string;
    ukuranBaju?: string;
    ukuranCelana?: string;
  }) {
    const pendaftarList = await db.select().from(ppdbPendaftar).where(eq(ppdbPendaftar.noPendaftaran, noPendaftaran));
    if (pendaftarList.length === 0) throw new Error('Pendaftar tidak ditemukan');
    const pendaftar = pendaftarList[0];

    if (pendaftar.status !== 'diterima') throw new Error('Status pendaftar belum atau tidak lulus');

    // Check if already exists
    const existing = await db.select().from(ppdbDaftarUlang).where(eq(ppdbDaftarUlang.pendaftarId, pendaftar.id));
    if (existing.length > 0) {
      await db.update(ppdbDaftarUlang)
        .set({
          buktiPembayaranUrl: data.buktiPembayaranUrl !== undefined ? data.buktiPembayaranUrl : existing[0].buktiPembayaranUrl,
          ijazahUrl: data.ijazahUrl !== undefined ? data.ijazahUrl : existing[0].ijazahUrl,
          kkUrl: data.kkUrl !== undefined ? data.kkUrl : existing[0].kkUrl,
          kipUrl: data.kipUrl !== undefined ? data.kipUrl : existing[0].kipUrl,
          photoUrl: data.photoUrl !== undefined ? data.photoUrl : existing[0].photoUrl,
          ukuranBaju: data.ukuranBaju !== undefined ? data.ukuranBaju : existing[0].ukuranBaju,
          ukuranCelana: data.ukuranCelana !== undefined ? data.ukuranCelana : existing[0].ukuranCelana,
          updatedAt: new Date()
        })
        .where(eq(ppdbDaftarUlang.id, existing[0].id));
      return { success: true, updated: true };
    } else {
      await db.insert(ppdbDaftarUlang).values({
        pendaftarId: pendaftar.id,
        buktiPembayaranUrl: data.buktiPembayaranUrl || null,
        ijazahUrl: data.ijazahUrl || null,
        kkUrl: data.kkUrl || null,
        kipUrl: data.kipUrl || null,
        photoUrl: data.photoUrl || null,
        ukuranBaju: data.ukuranBaju || null,
        ukuranCelana: data.ukuranCelana || null,
        status: 'menunggu_validasi'
      });
      return { success: true, inserted: true };
    }
  }

  static async getDaftarUlangInfo(noPendaftaran: string) {
    const pendaftarList = await db.select().from(ppdbPendaftar).where(eq(ppdbPendaftar.noPendaftaran, noPendaftaran));
    if (pendaftarList.length === 0) return null;
    const pendaftar = pendaftarList[0];

    const [dList, dataDiri, dataSekolah, jalurData, dokumenList] = await Promise.all([
      db.select().from(ppdbDaftarUlang).where(eq(ppdbDaftarUlang.pendaftarId, pendaftar.id)),
      db.select().from(ppdbDataDiri).where(eq(ppdbDataDiri.pendaftarId, pendaftar.id)),
      db.select().from(ppdbDataSekolah).where(eq(ppdbDataSekolah.pendaftarId, pendaftar.id)),
      db.select().from(ppdbJalur).where(eq(ppdbJalur.id, pendaftar.jalurId)),
      db.select().from(ppdbDokumen).where(eq(ppdbDokumen.pendaftarId, pendaftar.id)),
    ]);

    // Find registration photo from documents (uploaded during initial registration)
    const registrationPhoto = dokumenList.find(d => d.jenisDokumen === 'Pas Foto 3x4');

    return {
      ...(dList.length > 0 ? dList[0] : {}),
      validationCode: pendaftar.validationCode || null,
      namaLengkap: dataDiri[0]?.namaLengkap || null,
      nisn: pendaftar.nisn,
      noPendaftaran: pendaftar.noPendaftaran,
      sekolahAsal: dataSekolah[0]?.namaSekolah || null,
      jalurSeleksi: jalurData[0]?.namaJalur || null,
      // Extended fields for PDF generation
      tempatLahir: dataDiri[0]?.tempatLahir || null,
      tanggalLahir: dataDiri[0]?.tanggalLahir || null,
      jenisKelamin: dataDiri[0]?.jenisKelamin || null,
      alamat: dataDiri[0]?.alamat || null,
      namaAyah: dataDiri[0]?.namaAyah || null,
      namaIbu: dataDiri[0]?.namaIbu || null,
      noHpOrtu: dataDiri[0]?.noHpOrtu || null,
      npsn: dataSekolah[0]?.npsn || null,
      registrationPhotoUrl: registrationPhoto?.filePath || null,
    };
  }

  /** Verify a validation code from QR scan */
  static async verifyValidationCode(code: string) {
    const results = await db.select().from(ppdbPendaftar).where(eq(ppdbPendaftar.validationCode, code));
    if (results.length === 0) return null;
    const pendaftar = results[0];

    const [dataDiri, dataSekolah, jalurData] = await Promise.all([
      db.select().from(ppdbDataDiri).where(eq(ppdbDataDiri.pendaftarId, pendaftar.id)),
      db.select().from(ppdbDataSekolah).where(eq(ppdbDataSekolah.pendaftarId, pendaftar.id)),
      db.select().from(ppdbJalur).where(eq(ppdbJalur.id, pendaftar.jalurId)),
    ]);

    return {
      noPendaftaran: pendaftar.noPendaftaran,
      nisn: pendaftar.nisn,
      namaLengkap: dataDiri[0]?.namaLengkap || null,
      sekolahAsal: dataSekolah[0]?.namaSekolah || null,
      jalurSeleksi: jalurData[0]?.namaJalur || null,
      status: pendaftar.status,
      validationCode: pendaftar.validationCode,
      tglDaftar: pendaftar.tglDaftar,
    };
  }
}
