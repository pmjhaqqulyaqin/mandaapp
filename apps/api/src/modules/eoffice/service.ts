import { db } from '../../db';
import { jenisSurats, suratKeluars, suratMasuks, masterKkas, user } from '../../db/schema';
import { eq, desc, asc, and, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const DEWAHOSTER_URL = process.env.FRONTEND_URL || 'https://mandalotim.sch.id';
const UPDATE_SECRET = process.env.UPDATE_SECRET || 'MandaApp_Secret_Key_Update_2026!';

export class EOfficeService {

  // Get all registered Jenis Surat templates
  static async getAllJenisSurat() {
    return await db.select().from(jenisSurats).orderBy(jenisSurats.namaJenis);
  }

  static async createJenisSurat(data: any) {
    return await db.insert(jenisSurats).values({
      id: uuidv4(),
      namaJenis: data.namaJenis,
      kodeJenis: data.kodeJenis,
      formatPenomoran: data.formatPenomoran,
      butuhKka: data.butuhKka,
      butuhDerajat: data.butuhDerajat
    }).returning();
  }

  static async deleteJenisSurat(id: string) {
    return await db.delete(jenisSurats).where(eq(jenisSurats.id, id));
  }

  // Get all Surat Keluar records
  static async geSuratKeluarList() {
    const list = await db.select()
      .from(suratKeluars)
      .leftJoin(jenisSurats, eq(suratKeluars.jenisSuratId, jenisSurats.id))
      .leftJoin(user, eq(suratKeluars.userIdPengambil, user.id))
      .orderBy(desc(suratKeluars.tahun), asc(suratKeluars.nomorUrut));
      
    // Flatten data to solve undefined properties in frontend loop
    return list.map(item => ({
      ...item.surat_keluars,
      jenis_surats: item.jenis_surats,
      pengambil: item.user
    }));
  }

  // Generate new Surat Keluar Number
  static async generateNomor(data: {
    jenisSuratId: string;
    derajatKode?: string;
    kodeSatker?: string;
    kkaKode?: string;
    perihal: string;
    tujuan: string;
    userId: string;
  }) {
    const tahunSekarang = new Date().getFullYear().toString();
    const bulanSekarang = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // Due to Drizzle currently not supporting interactive transactions dynamically replacing locks easily without raw queries, 
    // we use a simple approach here. In heavy production, use row-level locks or serialize.
    return await db.transaction(async (tx) => {
      // 1. Get Jenis Surat
      const jenisRows = await tx.select().from(jenisSurats).where(eq(jenisSurats.id, data.jenisSuratId));
      if (!jenisRows.length) throw new Error('Jenis Surat tidak ditemukan');
      const jenisSurat = jenisRows[0];

      // 2. Determine sequencing logic based on letter type (Isolated for SK vs Global for Others)
      let lastSuratList;
      if (jenisSurat.kodeJenis === 'SK') {
        // Isolated sequence for SK
        lastSuratList = await tx.select({ nomorUrut: suratKeluars.nomorUrut })
          .from(suratKeluars)
          .where(
            and(
              eq(suratKeluars.tahun, tahunSekarang),
              eq(suratKeluars.jenisSuratId, jenisSurat.id)
            )
          )
          .orderBy(desc(suratKeluars.nomorUrut))
          .limit(1);
      } else {
        // Global sequence for others, excluding SK
        const skTypeRows = await tx.select({ id: jenisSurats.id }).from(jenisSurats).where(eq(jenisSurats.kodeJenis, 'SK')).limit(1);
        const skTypeId = skTypeRows.length > 0 ? skTypeRows[0].id : null;

        if (skTypeId) {
          lastSuratList = await tx.select({ nomorUrut: suratKeluars.nomorUrut })
            .from(suratKeluars)
            .where(
              and(
                eq(suratKeluars.tahun, tahunSekarang),
                ne(suratKeluars.jenisSuratId, skTypeId)
              )
            )
            .orderBy(desc(suratKeluars.nomorUrut))
            .limit(1);
        } else {
          lastSuratList = await tx.select({ nomorUrut: suratKeluars.nomorUrut })
            .from(suratKeluars)
            .where(eq(suratKeluars.tahun, tahunSekarang))
            .orderBy(desc(suratKeluars.nomorUrut))
            .limit(1);
        }
      }

      const lastUrut = lastSuratList.length > 0 ? (lastSuratList[0].nomorUrut || 0) : 0;
      const nextUrut = lastUrut + 1;

      // 3. String Replacement Engine
      let nomorHasil = jenisSurat.formatPenomoran;

      // Conditional formatting based on Jenis: SK usually doesn't need leading zeros, SD does.
      if (jenisSurat.kodeJenis === 'SK') {
        nomorHasil = nomorHasil.replace('{{nomor_urut}}', String(nextUrut));
      } else {
        nomorHasil = nomorHasil.replace('{{nomor_urut}}', String(nextUrut).padStart(3, '0'));
      }

      nomorHasil = nomorHasil.replace('{{tahun}}', tahunSekarang);
      nomorHasil = nomorHasil.replace('{{bulan}}', bulanSekarang);

      if (jenisSurat.butuhKka) {
        nomorHasil = nomorHasil.replace('{{kka_kode}}', data.kkaKode || '');
        nomorHasil = nomorHasil.replace('{{kode_satker}}', data.kodeSatker || '');
      }
      if (jenisSurat.butuhDerajat) {
        nomorHasil = nomorHasil.replace('{{derajat}}', data.derajatKode || '');
      }

      // 4. Save to DB
      const result = await tx.insert(suratKeluars).values({
        id: uuidv4(),
        jenisSuratId: jenisSurat.id,
        nomorUrut: nextUrut,
        nomorLengkap: nomorHasil,
        derajatKode: data.derajatKode,
        kodeSatker: data.kodeSatker,
        kkaKode: data.kkaKode,
        bulan: bulanSekarang,
        tahun: tahunSekarang,
        perihal: data.perihal,
        tujuan: data.tujuan,
        userIdPengambil: data.userId
      }).returning();

      return result[0];
    });
  }

  // --- Surat Masuk ---
  static async getSuratMasukList() {
    return await db.select().from(suratMasuks).orderBy(desc(suratMasuks.tahun), asc(suratMasuks.nomorUrut));
  }

  static async registerSuratMasuk(data: Omit<typeof suratMasuks.$inferInsert, 'id' | 'nomorAgenda' | 'nomorUrut'>) {
    // Generate unique nomor agenda: e.g., M-001/2026
    const tahunSekarang = new Date().getFullYear().toString();
    return await db.transaction(async (tx) => {
      // Find latest agenda & nomor urut for current year (Annual Reset Support)
      const lastMasukList = await tx.select({ nomorUrut: suratMasuks.nomorUrut })
        .from(suratMasuks)
        .where(eq(suratMasuks.tahun, tahunSekarang))
        .orderBy(desc(suratMasuks.nomorUrut))
        .limit(1);
      
      const lastUrut = lastMasukList.length > 0 ? (lastMasukList[0].nomorUrut || 0) : 0;
      const nextUrut = lastUrut + 1;

      const nomorAgenda = `M-${String(nextUrut).padStart(3, '0')}/${tahunSekarang}`;

      const inserted = await tx.insert(suratMasuks).values({
        id: uuidv4(),
        nomorUrut: nextUrut,
        nomorAgenda,
        tahun: tahunSekarang,
        ...data
      }).returning();

      return inserted[0];
    });
  }

  static async seedTemplates() {
    // Seed default Master templates if empty
    const exist = await db.select().from(jenisSurats).limit(1);
    if (!exist.length) {
      await db.insert(jenisSurats).values([
        {
          id: uuidv4(),
          namaJenis: 'Surat Dinas Biasa',
          kodeJenis: 'SD',
          formatPenomoran: '{{derajat}}-{{nomor_urut}}/{{kode_satker}}/{{kka_kode}}/{{bulan}}/{{tahun}}',
          butuhKka: true,
          butuhDerajat: true
        },
        {
          id: uuidv4(),
          namaJenis: 'Surat Keputusan (SK)',
          kodeJenis: 'SK',
          formatPenomoran: 'Nomor {{nomor_urut}} Tahun {{tahun}}',
          butuhKka: false,
          butuhDerajat: false
        },
        {
          id: uuidv4(),
          namaJenis: 'Surat Tugas',
          kodeJenis: 'ST',
          formatPenomoran: '{{nomor_urut}}/{{kode_satker}}/{{kka_kode}}/{{bulan}}/{{tahun}}',
          butuhKka: true,
          butuhDerajat: false
        }
      ]);
    }
    return { success: true };
  }

  // --- EXCEL EXPORTS (AUDIT) ---
  static async exportRekapSuratKeluar() {
    const data = await this.geSuratKeluarList();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Surat Keluar');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal Generate', key: 'tanggal', width: 20 },
      { header: 'Nomor Urut', key: 'urut', width: 15 },
      { header: 'Nomor Lengkap', key: 'nomor', width: 35 },
      { header: 'Perihal', key: 'perihal', width: 40 },
      { header: 'Tujuan', key: 'tujuan', width: 35 },
    ];

    sheet.getRow(1).font = { bold: true };

    data.forEach((row: any, i) => {
      sheet.addRow({
        no: i + 1,
        tanggal: row.tanggalGenerate ? new Date(row.tanggalGenerate).toLocaleDateString() : '',
        urut: row.nomorUrut,
        nomor: row.nomorLengkap,
        perihal: row.perihal,
        tujuan: row.tujuan || '-'
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  static async exportRekapSuratMasuk() {
    const data = await this.getSuratMasukList();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Surat Masuk');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'No Urut', key: 'no_urut', width: 10 },
      { header: 'Tgl Terima', key: 'tgl_terima', width: 15 },
      { header: 'No Agenda', key: 'agenda', width: 25 },
      { header: 'Tgl Surat', key: 'tgl_surat', width: 15 },
      { header: 'No Surat Asli', key: 'asli', width: 30 },
      { header: 'Pengirim', key: 'pengirim', width: 35 },
      { header: 'Perihal', key: 'perihal', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true };

    data.forEach((row, i) => {
      sheet.addRow({
        no: i + 1,
        no_urut: row.nomorUrut || '-',
        tgl_terima: row.tanggalDiterima ? new Date(row.tanggalDiterima).toLocaleDateString() : '',
        agenda: row.nomorAgenda,
        tgl_surat: row.tanggalSurat ? new Date(row.tanggalSurat).toLocaleDateString() : '',
        asli: row.nomorSuratAsli,
        pengirim: row.pengirim,
        perihal: row.perihal
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  // --- KKA (Klasifikasi Kode Arsip) ---
  static async getAllKka() {
    return await db.select().from(masterKkas).orderBy(masterKkas.kode);
  }

  static async createKka(data: { kode: string, keterangan: string }) {
    return await db.insert(masterKkas).values({
      id: uuidv4(),
      kode: data.kode,
      keterangan: data.keterangan
    }).returning();
  }

  static async deleteKka(id: string) {
    return await db.delete(masterKkas).where(eq(masterKkas.id, id));
  }

  static async deleteSuratKeluar(id: string) {
    return await db.delete(suratKeluars).where(eq(suratKeluars.id, id));
  }

  static async deleteArchiveOnHosting(fileUrl: string) {
    if (!fileUrl) return;
    try {
      const filename = fileUrl.split('/').pop();
      if (!filename) return;

      await axios.post(`${DEWAHOSTER_URL}/system-updater.php?action=delete_archive`, 
        { filename },
        { headers: { 'Authorization': `Bearer ${UPDATE_SECRET}`, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Gagal menghapus file lama di hosting:', error);
      // biarkan tetap lanjut meski gagal hapus file lama
    }
  }

  static async uploadSuratKeluar(id: string, file: any) {
    if (!file) throw new Error('File tidak ditemukan');

    // 1. Ambil data lama untuk hapus file
    const oldData = await db.select({ fileUrl: suratKeluars.fileUrl }).from(suratKeluars).where(eq(suratKeluars.id, id)).limit(1);
    if (oldData[0]?.fileUrl) {
      await this.deleteArchiveOnHosting(oldData[0].fileUrl);
    }

    // 2. Upload ke Bridge
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), { filename: file.originalname });

    const response = await axios.post(`${DEWAHOSTER_URL}/system-updater.php?action=upload_archive`, formData, {
      headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${UPDATE_SECRET}` },
      timeout: 60000
    });

    if (!response.data?.success) throw new Error(response.data?.error || 'Gagal upload ke hosting');

    const newUrl = response.data.url;

    // 3. Update DB
    return await db.update(suratKeluars).set({ fileUrl: newUrl }).where(eq(suratKeluars.id, id));
  }

  static async updateSuratKeluar(id: string, data: any) {
    return await db.update(suratKeluars).set({
      perihal: data.perihal,
      tujuan: data.tujuan
    }).where(eq(suratKeluars.id, id));
  }

  static async uploadSuratMasuk(id: string, file: any) {
    if (!file) throw new Error('File tidak ditemukan');

    const oldData = await db.select({ fileUrl: suratMasuks.fileUrl }).from(suratMasuks).where(eq(suratMasuks.id, id)).limit(1);
    if (oldData[0]?.fileUrl) {
      await this.deleteArchiveOnHosting(oldData[0].fileUrl);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path), { filename: file.originalname });

    const response = await axios.post(`${DEWAHOSTER_URL}/system-updater.php?action=upload_archive`, formData, {
      headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${UPDATE_SECRET}` },
      timeout: 60000
    });

    if (!response.data?.success) throw new Error(response.data?.error || 'Gagal upload ke hosting');

    const newUrl = response.data.url;

    return await db.update(suratMasuks).set({ fileUrl: newUrl }).where(eq(suratMasuks.id, id));
  }

  static async deleteSuratMasuk(id: string) {
    return await db.delete(suratMasuks).where(eq(suratMasuks.id, id));
  }

  static async updateSuratMasuk(id: string, data: any) {
    return await db.update(suratMasuks).set({
      perihal: data.perihal,
      pengirim: data.pengirim,
      nomorSuratAsli: data.nomorSuratAsli
    }).where(eq(suratMasuks.id, id));
  }
}
