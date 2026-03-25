import { db } from '../../db';
import { jenisSurats, suratKeluars, suratMasuks } from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';

export class EOfficeService {

  // Get all registered Jenis Surat templates
  static async getAllJenisSurat() {
    return await db.select().from(jenisSurats).orderBy(jenisSurats.namaJenis);
  }

  // Get all Surat Keluar records
  static async geSuratKeluarList() {
    return await db.select()
      .from(suratKeluars)
      .leftJoin(jenisSurats, eq(suratKeluars.jenisSuratId, jenisSurats.id))
      .orderBy(desc(suratKeluars.tanggalGenerate));
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

      // 2. Get latest Nomor Urut for this Jenis Surat in the current year
      const lastSuratList = await tx.select({ nomorUrut: suratKeluars.nomorUrut })
        .from(suratKeluars)
        .where(
          and(
            eq(suratKeluars.jenisSuratId, jenisSurat.id),
            eq(suratKeluars.tahun, tahunSekarang)
          )
        )
        .orderBy(desc(suratKeluars.nomorUrut))
        .limit(1);

      const nextUrut = (lastSuratList[0]?.nomorUrut || 0) + 1;

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
    return await db.select().from(suratMasuks).orderBy(desc(suratMasuks.tanggalDiterima));
  }

  static async registerSuratMasuk(data: Omit<typeof suratMasuks.$inferInsert, 'id' | 'nomorAgenda'>) {
    // Generate unique nomor agenda: e.g., M-001/2026
    const tahunSekarang = new Date().getFullYear().toString();
    return await db.transaction(async (tx) => {
      // Find latest agenda
      // Drizzle equivalent for "like '%/2026'" or we can just fetch all and sort, but let's just use count for simplicity here
      const allThisYear = await tx.select().from(suratMasuks);
      const filtered = allThisYear.filter(s => s.nomorAgenda.endsWith(`/${tahunSekarang}`));
      const nextNum = filtered.length + 1;

      const nomorAgenda = `M-${String(nextNum).padStart(3, '0')}/${tahunSekarang}`;

      const inserted = await tx.insert(suratMasuks).values({
        id: uuidv4(),
        nomorAgenda,
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

    data.forEach((row, i) => {
      sheet.addRow({
        no: i + 1,
        tanggal: row.surat_keluars.tanggalGenerate ? new Date(row.surat_keluars.tanggalGenerate).toLocaleDateString() : '',
        urut: row.surat_keluars.nomorUrut,
        nomor: row.surat_keluars.nomorLengkap,
        perihal: row.surat_keluars.perihal,
        tujuan: row.surat_keluars.tujuan || '-'
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
}
