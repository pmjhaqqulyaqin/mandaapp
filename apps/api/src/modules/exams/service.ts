import { db } from '../../db';
import {
  ujian, panitiaUjian, jadwalUjian, ruangUjian,
  penugasanPengawas, distribusiPeserta, employees,
  studentProfiles, classes, schoolEvents,
  cardSettings, siteSettings
} from '../../db/schema';
import { eq, desc, asc, and, inArray, gte, lte, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export class ExamService {

  // ============ SHARED: Logo Helper for Excel Exports ============

  /**
   * Resolves an image URL/path/dataURI to a Buffer for embedding in Excel.
   * Handles: data: URIs, local uploads/ files, full URLs, and relative /uploads/ paths.
   */
  private static async resolveImageBuffer(urlOrPath: string | null | undefined): Promise<{buf: Buffer, ext: string} | null> {
    if (!urlOrPath) return null;

    // Handle data URIs (base64 encoded images, e.g. from siteSettings global logo)
    if (urlOrPath.startsWith('data:')) {
      try {
        const matches = urlOrPath.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          let ext = matches[1].toLowerCase();
          if (ext === 'jpg') ext = 'jpeg';
          const buf = Buffer.from(matches[2], 'base64');
          console.log('[LOGO] Data URI OK, size:', buf.length, 'ext:', ext);
          return { buf, ext };
        }
      } catch (e) {
        console.log('[LOGO] Data URI parse error:', e);
      }
    }

    // Try local file (uploads/ directory)
    const basename = path.basename(urlOrPath);
    const localPath = path.join(process.cwd(), 'uploads', basename);
    if (fs.existsSync(localPath)) {
      let ext = path.extname(localPath).substring(1).toLowerCase();
      if (ext === 'jpg') ext = 'jpeg';
      const buf = fs.readFileSync(localPath);
      console.log('[LOGO] Local OK, size:', buf.length, 'ext:', ext);
      return { buf: buf as any, ext };
    }

    // Try downloading from URL
    try {
      let downloadUrl = urlOrPath;
      if (downloadUrl.startsWith('/')) {
        const baseUrl = process.env.FRONTEND_URL || process.env.BETTER_AUTH_URL || '';
        if (baseUrl) downloadUrl = baseUrl.replace(/\/$/, '') + downloadUrl;
      }
      if (downloadUrl.startsWith('http')) {
        console.log('[LOGO] Downloading from:', downloadUrl);
        const resp = await fetch(downloadUrl);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          let ext = path.extname(basename).substring(1).toLowerCase();
          if (ext === 'jpg') ext = 'jpeg';
          if (!ext) ext = 'png';
          console.log('[LOGO] Download OK, size:', buf.length, 'ext:', ext);
          return { buf, ext };
        } else {
          console.log('[LOGO] Download failed, status:', resp.status);
        }
      }
    } catch (downloadErr) {
      console.log('[LOGO] Download error:', downloadErr);
    }

    console.log('[LOGO] Could not resolve image for:', urlOrPath?.substring(0, 80));
    return null;
  }

  /**
   * Adds left (Kemenag) and right (Madrasah/school) logos to the kop surat area of an Excel sheet.
   * Uses cardSettings for logo URLs, with siteSettings global logo as fallback for the right logo.
   */
  private static async addLogosToSheet(
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    totalCols: number
  ): Promise<void> {
    try {
      const cardSettingsList = await db.select().from(cardSettings).limit(1);
      const cardSetting = cardSettingsList[0] || {} as any;

      const siteSettingsList = await db.select().from(siteSettings);
      const globalLogoUrl = siteSettingsList.find(s => s.key === 'logo_url')?.value;

      // Set row heights for kop area so logo isn't vertically compressed
      for (let r = 1; r <= 4; r++) {
        sheet.getRow(r).height = 18;
      }

      // Logo Kiri (Kemenag)
      const logoKiri = await this.resolveImageBuffer(cardSetting.kemenagLogoUrl);
      if (logoKiri) {
        const logoId = workbook.addImage({ buffer: logoKiri.buf as any, extension: logoKiri.ext as any });
        sheet.addImage(logoId, {
          tl: { col: 0.2, row: 0.2 },
          ext: { width: 70, height: 70 }
        } as any);
      }

      // Logo Kanan (Madrasah) — fallback to global siteSettings logo
      const logoKananUrl = cardSetting.schoolLogoUrl || globalLogoUrl;
      const logoKanan = await this.resolveImageBuffer(logoKananUrl);
      if (logoKanan) {
        const logoId = workbook.addImage({ buffer: logoKanan.buf as any, extension: logoKanan.ext as any });
        sheet.addImage(logoId, {
          tl: { col: totalCols - 1.0, row: 0.2 },
          ext: { width: 70, height: 70 }
        } as any);
      }
    } catch (e) {
      console.error('[LOGO] Error adding logo to excel:', e);
    }
  }

  // ============ UJIAN (Master) ============

  static async getAllUjian() {
    const list = await db.select()
      .from(ujian)
      .leftJoin(employees, eq(ujian.ketuaPanitiaId, employees.id))
      .orderBy(desc(ujian.createdAt));

    return list.map(item => ({
      ...item.ujian,
      ketuaPanitia: item.employees
    }));
  }

  static async getUjianById(id: string) {
    const rows = await db.select()
      .from(ujian)
      .leftJoin(employees, eq(ujian.ketuaPanitiaId, employees.id))
      .where(eq(ujian.id, id));
    if (!rows.length) return null;
    return { ...rows[0].ujian, ketuaPanitia: rows[0].employees };
  }

  static async createUjian(data: any) {
    const result = await db.insert(ujian).values({
      id: uuidv4(),
      namaUjian: data.namaUjian,
      jenis: data.jenis,
      tahunAjaran: data.tahunAjaran,
      semester: data.semester,
      tanggalMulai: data.tanggalMulai,
      tanggalSelesai: data.tanggalSelesai,
      ketuaPanitiaId: data.ketuaPanitiaId || null,
      status: data.status || 'aktif',
      pengaturan: data.pengaturan || {}
    }).returning();
    return result[0];
  }

  static async updateUjian(id: string, data: any) {
    // Build update object dynamically — only include fields that are explicitly provided.
    // This prevents callers sending partial data from accidentally wiping out existing fields
    // (e.g., PengaturanPengawasModal sends only { pengaturan } which should NOT clear namaUjian, etc.)
    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (data.namaUjian !== undefined) updateFields.namaUjian = data.namaUjian;
    if (data.jenis !== undefined) updateFields.jenis = data.jenis;
    if (data.tahunAjaran !== undefined) updateFields.tahunAjaran = data.tahunAjaran;
    if (data.semester !== undefined) updateFields.semester = data.semester;
    if (data.tanggalMulai !== undefined) updateFields.tanggalMulai = data.tanggalMulai;
    if (data.tanggalSelesai !== undefined) updateFields.tanggalSelesai = data.tanggalSelesai;
    if (data.ketuaPanitiaId !== undefined) updateFields.ketuaPanitiaId = data.ketuaPanitiaId || null;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.pengaturan !== undefined) {
      // Deep merge pengaturan: merge nested objects (e.g. kartuPeserta, pengawasGroups, ttd)
      // so that saving from one tab doesn't wipe settings saved from another tab
      const existing = await this.getUjianById(id);
      const existingPengaturan = (existing?.pengaturan as any) || {};
      const incoming = data.pengaturan;
      
      const merged: Record<string, any> = { ...existingPengaturan };
      for (const key of Object.keys(incoming)) {
        if (
          incoming[key] !== null &&
          typeof incoming[key] === 'object' &&
          !Array.isArray(incoming[key]) &&
          typeof existingPengaturan[key] === 'object' &&
          existingPengaturan[key] !== null &&
          !Array.isArray(existingPengaturan[key])
        ) {
          // Deep merge nested objects (e.g. kartuPeserta)
          merged[key] = { ...existingPengaturan[key], ...incoming[key] };
        } else {
          merged[key] = incoming[key];
        }
      }
      updateFields.pengaturan = merged;
    }

    return await db.update(ujian).set(updateFields).where(eq(ujian.id, id)).returning();
  }

  static async deleteUjian(id: string) {
    return await db.delete(ujian).where(eq(ujian.id, id));
  }

  // ============ PANITIA UJIAN ============

  static async getPanitia(ujianId: string) {
    const list = await db.select()
      .from(panitiaUjian)
      .leftJoin(employees, eq(panitiaUjian.pegawaiId, employees.id))
      .where(eq(panitiaUjian.ujianId, ujianId))
      .orderBy(asc(panitiaUjian.urutan));

    return list.map(item => ({
      ...item.panitia_ujian,
      pegawai: item.employees
    }));
  }

  static async addPanitia(ujianId: string, data: any) {
    const result = await db.insert(panitiaUjian).values({
      id: uuidv4(),
      ujianId,
      pegawaiId: data.pegawaiId,
      jabatan: data.jabatan,
      urutan: data.urutan || 0
    }).returning();
    return result[0];
  }

  static async deletePanitia(id: string) {
    return await db.delete(panitiaUjian).where(eq(panitiaUjian.id, id));
  }

  // ============ JADWAL UJIAN ============

  static async getJadwal(ujianId: string) {
    return await db.select()
      .from(jadwalUjian)
      .where(eq(jadwalUjian.ujianId, ujianId))
      .orderBy(asc(jadwalUjian.tanggal), asc(jadwalUjian.waktuMulai));
  }

  static async addJadwal(ujianId: string, data: any) {
    const result = await db.insert(jadwalUjian).values({
      id: uuidv4(),
      ujianId,
      tanggal: data.tanggal,
      waktuMulai: data.waktuMulai,
      waktuSelesai: data.waktuSelesai,
      mataPelajaran: data.mataPelajaran,
      kelas: data.kelas || null
    }).returning();
    return result[0];
  }

  static async updateJadwal(id: string, data: any) {
    return await db.update(jadwalUjian).set({
      tanggal: data.tanggal,
      waktuMulai: data.waktuMulai,
      waktuSelesai: data.waktuSelesai,
      mataPelajaran: data.mataPelajaran,
      kelas: data.kelas || null
    }).where(eq(jadwalUjian.id, id)).returning();
  }

  static async deleteJadwal(id: string) {
    return await db.delete(jadwalUjian).where(eq(jadwalUjian.id, id));
  }

  static async downloadJadwalTemplateExcel(ujianId: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Jadwal Pivot');

    let classList;
    const peng = ujianData.pengaturan as any || {};
    const selectFields = {
      id: classes.id,
      name: classes.name
    };

    if (peng.kelasPeserta && peng.kelasPeserta.length > 0) {
      classList = await db.select(selectFields)
        .from(classes)
        .where(inArray(classes.id, peng.kelasPeserta))
        .orderBy(asc(classes.name));
    } else {
      classList = await db.select(selectFields)
        .from(classes)
        .orderBy(asc(classes.name));
    }

    const cols = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Hari/Tanggal', key: 'hariTanggal', width: 25 },
      { header: 'Waktu', key: 'waktu', width: 20 },
    ];
    classList.forEach((c: any) => {
      cols.push({ header: c.name, key: c.name, width: 20 });
    });
    sheet.columns = cols;
    sheet.getRow(1).font = { bold: true };

    const w = peng.waktuSesi || {
      normal: [{ mulai: '07:30', selesai: '09:30' }, { mulai: '10:00', selesai: '12:00' }],
      jumat: [{ mulai: '07:15', selesai: '09:15' }, { mulai: '09:30', selesai: '11:30' }]
    };

    const start = new Date(ujianData.tanggalMulai);
    const end = new Date(ujianData.tanggalSelesai);

    // Fetch Holidays
    const holidayList = await db.select().from(schoolEvents).where(
      and(
        inArray(schoolEvents.category, ['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap']),
        or(
          and(gte(schoolEvents.eventDate, ujianData.tanggalMulai), lte(schoolEvents.eventDate, ujianData.tanggalSelesai)),
          and(gte(schoolEvents.endDate, ujianData.tanggalMulai), lte(schoolEvents.endDate, ujianData.tanggalSelesai))
        )
      )
    );

    const holidayDates = new Set<string>();
    holidayList.forEach(h => {
      const hStart = new Date(h.eventDate);
      const hEnd = h.endDate ? new Date(h.endDate) : hStart;
      for (let d = new Date(hStart); d <= hEnd; d.setDate(d.getDate() + 1)) {
        holidayDates.add(d.toISOString().split('T')[0]);
      }
    });

    let no = 1;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      if (d.getDay() === 0) continue; // Skip Sunday
      if (holidayDates.has(dateKey)) continue; // Skip Holiday

      const isJumat = d.getDay() === 5;
      const sesi = isJumat ? w.jumat : w.normal;
      const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dateStr = `${hariNames[d.getDay()]}, ${d.toLocaleDateString('id-ID')}`;

      const row1: any = { no: no++, hariTanggal: dateStr, waktu: `${sesi[0]?.mulai || ''} - ${sesi[0]?.selesai || ''}` };
      sheet.addRow(row1);
      const row2: any = { no: no++, hariTanggal: '', waktu: `${sesi[1]?.mulai || ''} - ${sesi[1]?.selesai || ''}` };
      sheet.addRow(row2);
    }

    return await workbook.xlsx.writeBuffer();
  }

  static async importJadwalFromExcel(ujianId: string, buffer: any) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('File Excel kosong');

    const classesCols: string[] = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      if (colNumber > 3) classesCols.push(cell.text?.trim() || '');
    });

    const parsedRows: any[] = [];
    let lastTanggal = '';

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const ht = row.getCell(2).text?.trim(); // Hari/Tanggal
      if (ht) {
        const parts = ht.split(',');
        if (parts.length > 1) {
          const rawDateStr = parts[1].trim();
          const [d, m, y] = rawDateStr.split(/[\/\-]/); // Works for DD/MM/YYYY
          if (d && m && y) {
            const yearObj = y.length === 2 ? `20${y}` : y;
            lastTanggal = `${yearObj}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else lastTanggal = rawDateStr;
        } else {
          lastTanggal = ht;
        }
      }

      const waktu = row.getCell(3).text?.trim();
      let waktuMulai = '';
      let waktuSelesai = '';
      if (waktu) {
        const span = waktu.split('-');
        waktuMulai = span[0]?.trim();
        waktuSelesai = span[1]?.trim() || '';
      }

      classesCols.forEach((className, idx) => {
        const mapel = row.getCell(4 + idx).text?.trim();
        if (mapel && mapel !== '' && mapel !== '-') {
          parsedRows.push({ tanggal: lastTanggal, waktuMulai, waktuSelesai, mataPelajaran: mapel, kelas: className });
        }
      });
    });

    if (parsedRows.length === 0) throw new Error('Tidak ada data valid dalam file');

    const grouped: Record<string, string[]> = {};
    parsedRows.forEach(r => {
      const key = `${r.tanggal}__${r.waktuMulai}__${r.waktuSelesai}__${r.mataPelajaran}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r.kelas);
    });

    const finalRows = Object.entries(grouped).map(([key, classes]) => {
      const [tanggal, waktuMulai, waktuSelesai, mapel] = key.split('__');
      return {
        id: uuidv4(),
        ujianId,
        tanggal,
        waktuMulai,
        waktuSelesai,
        mataPelajaran: mapel,
        kelas: classes.join(', ')
      };
    });

    const importHolidays = await db.select().from(schoolEvents).where(
      inArray(schoolEvents.category, ['holiday', 'cuti_bersama', 'semester_ganjil', 'semester_genap'])
    );
    const holidayDates = new Set<string>();
    importHolidays.forEach(h => {
      const hStart = new Date(h.eventDate);
      const hEnd = h.endDate ? new Date(h.endDate) : hStart;
      for (let d = new Date(hStart); d <= hEnd; d.setDate(d.getDate() + 1)) {
        holidayDates.add(d.toISOString().split('T')[0]);
      }
    });

    for (const row of finalRows) {
      const d = new Date(row.tanggal);
      if (d.getDay() === 0) {
        throw new Error(`Gagal Import: Tanggal ${row.tanggal} adalah hari Minggu.`);
      }
      if (holidayDates.has(row.tanggal)) {
        throw new Error(`Gagal Import: Tanggal ${row.tanggal} terdeteksi sebagai Hari Libur/Cuti Bersama.`);
      }
    }

    // --- Clear existing jadwal (and linked pengawas) so re-upload replaces old data ---
    const existingJadwal = await db.select({ id: jadwalUjian.id })
      .from(jadwalUjian)
      .where(eq(jadwalUjian.ujianId, ujianId));

    if (existingJadwal.length > 0) {
      const existingIds = existingJadwal.map(j => j.id);
      // Remove pengawas assignments that reference the old jadwal entries
      await db.delete(penugasanPengawas).where(inArray(penugasanPengawas.jadwalId, existingIds));
      // Remove old jadwal entries
      await db.delete(jadwalUjian).where(eq(jadwalUjian.ujianId, ujianId));
    }

    await db.insert(jadwalUjian).values(finalRows);
    return { imported: finalRows.length };
  }

  static async exportJadwalExcel(ujianId: string) {
    const jadwal = await this.getJadwal(ujianId);
    if (!jadwal.length) throw new Error("Jadwal masih kosong");
    const ujianData = await this.getUjianById(ujianId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Jadwal Ujian');

    const peng = ujianData?.pengaturan as any || {};
    const kop = peng.kop || {};
    const ttd = peng.ttd || {};

    let classList;
    const selectFields = {
      id: classes.id,
      name: classes.name
    };

    if (peng.kelasPeserta && peng.kelasPeserta.length > 0) {
      classList = await db.select(selectFields)
        .from(classes)
        .where(inArray(classes.id, peng.kelasPeserta))
        .orderBy(asc(classes.name));
    } else {
      classList = await db.select(selectFields)
        .from(classes)
        .orderBy(asc(classes.name));
    }
    const classNames = classList.map((c: any) => c.name);
    const totalCols = 3 + classNames.length;

    // Kop Surat
    sheet.mergeCells(1, 1, 1, totalCols);
    sheet.getCell(1, 1).value = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
    sheet.getCell(1, 1).font = { bold: true, size: 12 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center' };

    sheet.mergeCells(2, 1, 2, totalCols);
    sheet.getCell(2, 1).value = kop.instansi || 'MADRASAH ALIYAH NEGERI';
    sheet.getCell(2, 1).font = { bold: true, size: 14 };
    sheet.getCell(2, 1).alignment = { horizontal: 'center' };

    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell(3, 1).value = kop.panitia || 'PANITIA UJIAN';
    sheet.getCell(3, 1).font = { bold: true, size: 12 };
    sheet.getCell(3, 1).alignment = { horizontal: 'center' };

    sheet.mergeCells(4, 1, 4, totalCols);
    sheet.getCell(4, 1).value = kop.alamat || 'Alamat';
    sheet.getCell(4, 1).font = { size: 10 };
    sheet.getCell(4, 1).alignment = { horizontal: 'center' };

    const headerBorderObj = { bottom: { style: 'double' } } as any;
    for (let c = 1; c <= totalCols; c++) {
      sheet.getCell(4, c).border = headerBorderObj;
    }

    // Add logos to kop surat
    await this.addLogosToSheet(workbook, sheet, totalCols);

    sheet.addRow([]);
    sheet.mergeCells(6, 1, 6, totalCols);
    sheet.getCell(6, 1).value = `JADWAL ${ujianData?.namaUjian?.toUpperCase() || 'UJIAN'}`;
    sheet.getCell(6, 1).font = { bold: true, size: 12 };
    sheet.getCell(6, 1).alignment = { horizontal: 'center' };

    sheet.addRow([]);

    // Tabel Header Pivot
    sheet.mergeCells(8, 1, 9, 1); sheet.getCell(8, 1).value = 'No';
    sheet.mergeCells(8, 2, 9, 2); sheet.getCell(8, 2).value = 'Hari / Tanggal';
    sheet.mergeCells(8, 3, 9, 3); sheet.getCell(8, 3).value = 'Waktu';

    if (classNames.length > 0) {
      sheet.mergeCells(8, 4, 8, totalCols);
      sheet.getCell(8, 4).value = 'Kelas / Jurusan';
      sheet.getCell(8, 4).alignment = { horizontal: 'center' };
      classNames.forEach((n, idx) => {
        sheet.getCell(9, 4 + idx).value = n;
      });
    }

    for (let r = 8; r <= 9; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = sheet.getCell(r, c);
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true, size: 10 };
      }
    }

    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dateMap = new Map();
    jadwal.forEach((r: any) => {
      if (!dateMap.has(r.tanggal)) {
        const d = new Date(r.tanggal);
        dateMap.set(r.tanggal, { dateStr: `${hariNames[d.getDay()]}, ${d.toLocaleDateString('id-ID')}`, tDate: d.getTime(), sessions: new Map() });
      }
      const dObj = dateMap.get(r.tanggal);
      const tKey = `${r.waktuMulai} - ${r.waktuSelesai}`;

      if (!dObj.sessions.has(tKey)) dObj.sessions.set(tKey, {});
      const sObj = dObj.sessions.get(tKey);

      const classesInRow = (r.kelas || '').split(',').map((c: string) => c.trim());
      classesInRow.forEach((c: string) => {
        if (c && c !== '') sObj[c] = r.mataPelajaran;
      });
    });

    const dateArray = Array.from(dateMap.values()).sort((a, b) => a.tDate - b.tDate);

    let currentRowNum = 10;
    let no = 1;

    dateArray.forEach(dObj => {
      const sessions = Array.from(dObj.sessions.entries()).sort((a: any, b: any) => a[0].localeCompare(b[0]));

      sessions.forEach((sess: any, idx: number) => {
        const rowData = [];
        if (idx === 0) {
          rowData.push(no++);
          rowData.push(dObj.dateStr);
        } else {
          rowData.push('');
          rowData.push('');
        }
        rowData.push(sess[0]);

        classNames.forEach(cn => {
          rowData.push(sess[1][cn] || '-');
        });

        sheet.addRow(rowData);
        for (let c = 1; c <= totalCols; c++) {
          const cell = sheet.getCell(currentRowNum, c);
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.font = { size: 10 };
        }
        currentRowNum++;
      });

      if (sessions.length > 1) {
        const startR = currentRowNum - sessions.length;
        const endR = currentRowNum - 1;
        sheet.mergeCells(startR, 1, endR, 1); // No
        sheet.mergeCells(startR, 2, endR, 2); // Hari/Tgl
      }
    });

    sheet.addRow([]); sheet.addRow([]);
    const ttdR = currentRowNum + 2;
    const ttdColStr = Math.max(1, totalCols - 2);

    const dStr = ttd.tanggal ? new Date(ttd.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    sheet.getCell(ttdR, ttdColStr).value = `${ttd.tempat || 'Tempat'}, ${dStr}`;
    sheet.getCell(ttdR + 1, ttdColStr).value = ttd.jabatan || 'Kepala Madrasah';

    sheet.getCell(ttdR + 5, ttdColStr).value = ttd.nama || '';
    sheet.getCell(ttdR + 5, ttdColStr).font = { bold: true };
    sheet.getCell(ttdR + 6, ttdColStr).value = `NIP. ${ttd.nip || ''}`;

    // Columns width
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 18;
    for (let c = 4; c <= totalCols; c++) sheet.getColumn(c).width = 18;

    return await workbook.xlsx.writeBuffer();
  }

  // ============ RUANG UJIAN ============

  static async getRuang(ujianId: string) {
    return await db.select()
      .from(ruangUjian)
      .where(eq(ruangUjian.ujianId, ujianId))
      .orderBy(asc(ruangUjian.namaRuang));
  }

  static async addRuang(ujianId: string, data: any) {
    const result = await db.insert(ruangUjian).values({
      id: uuidv4(),
      ujianId,
      namaRuang: data.namaRuang,
      kapasitas: data.kapasitas || 30
    }).returning();
    return result[0];
  }

  static async updateRuang(id: string, data: any) {
    return await db.update(ruangUjian).set({
      namaRuang: data.namaRuang,
      kapasitas: data.kapasitas
    }).where(eq(ruangUjian.id, id)).returning();
  }

  static async deleteRuang(id: string) {
    return await db.delete(ruangUjian).where(eq(ruangUjian.id, id));
  }

  // ============ PENUGASAN PENGAWAS ============

  static async getPengawas(ujianId: string) {
    // Get all penugasan for this ujian via jadwal
    const jadwalList = await db.select({ id: jadwalUjian.id })
      .from(jadwalUjian)
      .where(eq(jadwalUjian.ujianId, ujianId));

    if (jadwalList.length === 0) return [];

    const jadwalIds = jadwalList.map(j => j.id);

    const list = await db.select()
      .from(penugasanPengawas)
      .leftJoin(jadwalUjian, eq(penugasanPengawas.jadwalId, jadwalUjian.id))
      .leftJoin(ruangUjian, eq(penugasanPengawas.ruangId, ruangUjian.id))
      .leftJoin(employees, eq(penugasanPengawas.pengawasId, employees.id))
      .where(inArray(penugasanPengawas.jadwalId, jadwalIds))
      .orderBy(asc(jadwalUjian.tanggal), asc(jadwalUjian.waktuMulai), asc(ruangUjian.namaRuang));

    return list.map(item => ({
      ...item.penugasan_pengawas,
      jadwal: item.jadwal_ujian,
      ruang: item.ruang_ujian,
      pengawas: item.employees
    }));
  }

  static async addPengawas(data: any) {
    const result = await db.insert(penugasanPengawas).values({
      id: uuidv4(),
      jadwalId: data.jadwalId,
      ruangId: data.ruangId,
      pengawasId: data.pengawasId
    }).returning();
    return result[0];
  }

  static async deletePengawas(id: string) {
    return await db.delete(penugasanPengawas).where(eq(penugasanPengawas.id, id));
  }

  private static getAlphaCode(index: number): string {
    let code = '';
    let i = index;
    while (i >= 0) {
      code = String.fromCharCode((i % 26) + 65) + code;
      i = Math.floor(i / 26) - 1;
    }
    return code;
  }

  static async generatePengawas(ujianId: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = ujianData.pengaturan as any || {};
    const group1 = config.pengawasGroups?.group1 || [];
    const group2 = config.pengawasGroups?.group2 || [];

    if (group1.length === 0 || group2.length === 0) {
      throw new Error('Daftar Kelompok Pengawas (I & II) belum diatur.');
    }

    const jadwalList = await this.getJadwal(ujianId);
    const ruangList = await this.getRuang(ujianId);

    if (jadwalList.length === 0) throw new Error('Belum ada jadwal ujian');
    if (ruangList.length === 0) throw new Error('Belum ada ruang ujian');

    // Build a map of ruangId -> Set of class names (from distribusi peserta)
    // This tells us which classes are seated in which rooms
    const distribusiList = await db.select({
      ruangId: distribusiPeserta.ruangId,
      className: classes.name
    })
      .from(distribusiPeserta)
      .leftJoin(studentProfiles, eq(distribusiPeserta.siswaId, studentProfiles.id))
      .leftJoin(classes, eq(studentProfiles.classId, classes.id))
      .where(eq(distribusiPeserta.ujianId, ujianId));

    const roomClassMap = new Map<string, Set<string>>(); // ruangId -> Set<className>
    distribusiList.forEach(d => {
      if (d.ruangId && d.className) {
        if (!roomClassMap.has(d.ruangId)) roomClassMap.set(d.ruangId, new Set());
        roomClassMap.get(d.ruangId)!.add(d.className);
      }
    });

    const hasDistribusi = distribusiList.length > 0;

    // Identify unique sessions (Tanggal + Waktu) and collect participating classes
    const sessionMap = new Map();
    jadwalList.forEach((j: any) => {
      const key = `${j.tanggal}_${j.waktuMulai}_${j.waktuSelesai}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          tanggal: j.tanggal,
          waktuMulai: j.waktuMulai,
          waktuSelesai: j.waktuSelesai,
          ids: [],
          kelasList: new Set<string>() // classes participating in this session
        });
      }
      const sess = sessionMap.get(key);
      sess.ids.push(j.id);
      // Parse kelas from jadwal (comma-separated)
      if (j.kelas) {
        j.kelas.split(',').map((k: string) => k.trim()).filter(Boolean).forEach((k: string) => {
          sess.kelasList.add(k);
        });
      }
    });

    const sessions = Array.from(sessionMap.values()).sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      return a.waktuMulai.localeCompare(b.waktuMulai);
    });

    // Clear existing
    const allJadwalIds = jadwalList.map((j: any) => j.id);
    await db.delete(penugasanPengawas).where(inArray(penugasanPengawas.jadwalId, allJadwalIds));

    const assignments: any[] = [];
    const L1 = group1.length;
    const L2 = group2.length;

    sessions.forEach((sess, sIdx) => {
      // Determine which rooms are active for this session
      let activeRooms: typeof ruangList;

      if (hasDistribusi && sess.kelasList.size > 0) {
        // Only include rooms that have students from classes participating in this session
        activeRooms = ruangList.filter(ruang => {
          const roomClasses = roomClassMap.get(ruang.id);
          if (!roomClasses) return false;
          // Check if any of the room's classes overlap with the session's classes
          for (const className of roomClasses) {
            if (sess.kelasList.has(className)) return true;
          }
          return false;
        });
      } else {
        // No distribusi yet or no kelas info — fall back to all rooms
        activeRooms = ruangList;
      }

      activeRooms.forEach((ruang, rIdx) => {
        // Algorithm: G1 shifts -1, G2 shifts +1
        const idx1 = (((rIdx - sIdx) % L1) + L1) % L1;
        const idx2 = (rIdx + sIdx) % L2;

        const p1Id = group1[idx1];
        const p2Id = group2[idx2];

        // Assign both to every jadwal ID in this session
        sess.ids.forEach((jId: string) => {
          // Proctor 1 (Numeric)
          assignments.push({
            id: uuidv4(),
            jadwalId: jId,
            ruangId: ruang.id,
            pengawasId: p1Id,
            kodeLabel: (idx1 + 1).toString()
          });
          // Proctor 2 (Alphabetic)
          assignments.push({
            id: uuidv4(),
            jadwalId: jId,
            ruangId: ruang.id,
            pengawasId: p2Id,
            kodeLabel: this.getAlphaCode(idx2)
          });
        });
      });
    });

    if (assignments.length > 0) {
      await db.insert(penugasanPengawas).values(assignments);
    }

    return { generated: assignments.length, sessions: sessions.length };
  }

  static async exportPengawasExcel(ujianId: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = ujianData.pengaturan as any || {};
    const ttd = config.ttd || {};
    const kop = config.kop || {};

    const ruangList = await this.getRuang(ujianId);
    const jadwalList = await this.getJadwal(ujianId);
    const pengawasData = await this.getPengawas(ujianId);

    const group1Ids = config.pengawasGroups?.group1 || [];
    const group2Ids = config.pengawasGroups?.group2 || [];

    // Fetch employee names for legend
    const allGroupIds = [...new Set([...group1Ids, ...group2Ids])];
    const employeesData = allGroupIds.length > 0
      ? await db.select().from(employees).where(inArray(employees.id, allGroupIds))
      : [];
    const employeeMap = new Map(employeesData.map(e => [e.id, e.name]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Jadwal Pengawas');

    // 1. KOP SURAT
    sheet.mergeCells(1, 1, 1, Math.max(8, ruangList.length + 4));
    sheet.getCell(1, 1).value = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
    sheet.getCell(1, 1).alignment = { horizontal: 'center' };
    sheet.getCell(1, 1).font = { bold: true };

    sheet.mergeCells(2, 1, 2, Math.max(8, ruangList.length + 4));
    sheet.getCell(2, 1).value = kop.instansi || 'MADRASAH ALIYAH NEGERI 2 LOMBOK TIMUR';
    sheet.getCell(2, 1).alignment = { horizontal: 'center' };
    sheet.getCell(2, 1).font = { bold: true, size: 12 };

    sheet.mergeCells(3, 1, 3, Math.max(8, ruangList.length + 4));
    sheet.getCell(3, 1).value = kop.panitia || 'PANITIA ASESMEN SUMATIF...';
    sheet.getCell(3, 1).alignment = { horizontal: 'center' };
    sheet.getCell(3, 1).font = { bold: true };

    sheet.mergeCells(4, 1, 4, Math.max(8, ruangList.length + 4));
    sheet.getCell(4, 1).value = kop.alamat || 'Jl. Beririjarak...';
    sheet.getCell(4, 1).alignment = { horizontal: 'center' };
    sheet.getCell(4, 1).font = { italic: true, size: 9 };

    sheet.getRow(5).border = { bottom: { style: 'double' } };

    // Add logos to kop surat
    const kopTotalCols = Math.max(8, ruangList.length + 4);
    await this.addLogosToSheet(workbook, sheet, kopTotalCols);

    // 2. TITLE
    const titleRow = 7;
    sheet.mergeCells(titleRow, 1, titleRow, Math.max(8, ruangList.length + 4));
    sheet.getCell(titleRow, 1).value = 'JADWAL PENGAWAS DAN RUANG KEPENGAWASAN';
    sheet.getCell(titleRow, 1).alignment = { horizontal: 'center' };
    sheet.getCell(titleRow, 1).font = { bold: true, underline: true };

    sheet.mergeCells(titleRow + 1, 1, titleRow + 1, Math.max(8, ruangList.length + 4));
    sheet.getCell(titleRow + 1, 1).value = `${kop.instansi || 'MADRASAH'} TAHUN PELAJARAN ${ujianData.tahunAjaran || '-'}`;
    sheet.getCell(titleRow + 1, 1).alignment = { horizontal: 'center' };
    sheet.getCell(titleRow + 1, 1).font = { bold: true };

    // 3. TABLE HEADER
    const headRow = 10;
    const totalCols = 4 + ruangList.length;

    sheet.mergeCells(headRow, 1, headRow + 1, 1); sheet.getCell(headRow, 1).value = 'No';
    sheet.mergeCells(headRow, 2, headRow + 1, 2); sheet.getCell(headRow, 2).value = 'Hari/Tanggal';
    sheet.mergeCells(headRow, 3, headRow + 1, 3); sheet.getCell(headRow, 3).value = 'Jam';
    sheet.mergeCells(headRow, 4, headRow + 1, 4); sheet.getCell(headRow, 4).value = 'Waktu';

    sheet.mergeCells(headRow, 5, headRow, totalCols);
    sheet.getCell(headRow, 5).value = 'Ruang/Kode Pengawas';
    sheet.getCell(headRow, 5).alignment = { horizontal: 'center' };

    ruangList.forEach((r, idx) => {
      sheet.getCell(headRow + 1, 5 + idx).value = r.namaRuang;
    });

    // Style Header
    for (let r = headRow; r <= headRow + 1; r++) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = sheet.getCell(r, c);
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
    }

    // 4. DATA MATRIX
    const sessionMap = new Map();
    jadwalList.forEach((j: any) => {
      const key = `${j.tanggal}_${j.waktuMulai}_${j.waktuSelesai}`;
      if (!sessionMap.has(key)) {
        const d = new Date(j.tanggal);
        const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        sessionMap.set(key, {
          tanggal: j.tanggal,
          dateStr: `${hariNames[d.getDay()]}\n${d.toLocaleDateString('id-ID')}`,
          waktu: `${j.waktuMulai} - ${j.waktuSelesai}`,
          tDate: d.getTime(),
          wStart: j.waktuMulai,
          ids: []
        });
      }
      sessionMap.get(key).ids.push(j.id);
    });

    const sessions = Array.from(sessionMap.values()).sort((a, b) => {
      if (a.tDate !== b.tDate) return a.tDate - b.tDate;
      return a.wStart.localeCompare(b.wStart);
    });

    const assignmentsMap = new Map(); // key: jadwalId_ruangId, value: codes[]
    pengawasData.forEach(p => {
      const key = `${p.jadwalId}_${p.ruangId}`;
      if (!assignmentsMap.has(key)) assignmentsMap.set(key, []);
      assignmentsMap.get(key).push(p.kodeLabel);
    });

    let currentRowNum = headRow + 2;
    let noCounter = 1;
    let lastDate = '';

    sessions.forEach((sess, sIdx) => {
      const rowData = [];

      // No & Tanggal merging logic
      if (sess.tanggal !== lastDate) {
        rowData.push(noCounter++);
        rowData.push(sess.dateStr);
        lastDate = sess.tanggal;
      } else {
        rowData.push('');
        rowData.push('');
      }

      // Sesi (Jam)
      // Find session order for this day
      const daySessions = sessions.filter(s => s.tanggal === sess.tanggal);
      const sessIdxOnDay = daySessions.indexOf(sess);
      const roman = ['I', 'II', 'III', 'IV', 'V'][sessIdxOnDay] || (sessIdxOnDay + 1).toString();
      rowData.push(roman);
      rowData.push(sess.waktu);

      // Rooms
      ruangList.forEach(ruang => {
        // We need one of the jadwalIds from this session
        const jId = sess.ids[0];
        const codes = assignmentsMap.get(`${jId}_${ruang.id}`) || [];
        rowData.push(codes.sort().join('   ')); // Space between codes
      });

      const row = sheet.addRow(rowData);
      row.height = 25;

      for (let c = 1; c <= totalCols; c++) {
        const cell = sheet.getCell(currentRowNum, c);
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { size: 9 };
      }
      currentRowNum++;
    });

    // Merge cells for No and Hari/Tanggal
    let mergeStart = headRow + 2;
    for (let i = 0; i < sessions.length; i++) {
      const current = sessions[i];
      const next = sessions[i + 1];
      if (!next || next.tanggal !== current.tanggal) {
        if (mergeStart < headRow + 2 + i) {
          sheet.mergeCells(mergeStart, 1, headRow + 2 + i, 1);
          sheet.mergeCells(mergeStart, 2, headRow + 2 + i, 2);
        }
        mergeStart = headRow + 2 + i + 1;
      }
    }

    // 5. LEGEND TABLE (KODE & NAMA PENGAWAS)
    const legendStartRow = currentRowNum + 2;
    sheet.getCell(legendStartRow, 1).value = 'KODE & NAMA PENGAWAS';
    sheet.getCell(legendStartRow, 1).font = { bold: true, size: 9 };
    sheet.mergeCells(legendStartRow, 1, legendStartRow, 4);
    sheet.getCell(legendStartRow, 1).alignment = { horizontal: 'center' };
    sheet.getCell(legendStartRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    sheet.getCell(legendStartRow, 1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const legendHead = sheet.addRow(['', 'Pengawas I', '', 'Pengawas II']);
    legendHead.font = { bold: true, size: 8 };
    sheet.getRow(legendStartRow + 1).height = 15;
    for (let c = 1; c <= 4; c++) {
      const cell = sheet.getCell(legendStartRow + 1, c);
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }
    sheet.mergeCells(legendStartRow + 1, 1, legendStartRow + 1, 2);
    sheet.mergeCells(legendStartRow + 1, 3, legendStartRow + 1, 4);

    const maxLegend = Math.max(group1Ids.length, group2Ids.length);
    for (let i = 0; i < maxLegend; i++) {
      const p1Id = group1Ids[i];
      const p1Name = p1Id ? employeeMap.get(p1Id) || '-' : '';
      const p1Code = p1Id ? (i + 1).toString() : '';

      const p2Id = group2Ids[i];
      const p2Name = p2Id ? employeeMap.get(p2Id) || '-' : '';
      const p2Code = p2Id ? this.getAlphaCode(i) : '';

      const row = sheet.addRow([p1Code, p1Name, p2Code, p2Name]);
      row.font = { size: 8 };
      for (let c = 1; c <= 4; c++) {
        sheet.getCell(legendStartRow + 2 + i, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (c === 1 || c === 3) sheet.getCell(legendStartRow + 2 + i, c).alignment = { horizontal: 'center' };
      }
    }

    // 6. SIGNATURES
    const ttdRow = legendStartRow + 2;
    const ttdColStr = Math.max(6, totalCols - 1);
    const dStr = ttd.tanggal ? new Date(ttd.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

    sheet.getCell(ttdRow, ttdColStr).value = `${ttd.tempat || 'Wanasaba'}, ${dStr}`;
    sheet.getCell(ttdRow + 1, ttdColStr).value = ttd.jabatan || 'Kepala Madrasah';
    sheet.getCell(ttdRow + 5, ttdColStr).value = ttd.nama || '';
    sheet.getCell(ttdRow + 5, ttdColStr).font = { bold: true };
    sheet.getCell(ttdRow + 6, ttdColStr).value = `NIP. ${ttd.nip || ''}`;

    // Column widths
    sheet.getColumn(1).width = 4;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 5;
    sheet.getColumn(4).width = 14;
    for (let c = 5; c <= totalCols; c++) sheet.getColumn(c).width = 8;

    return await workbook.xlsx.writeBuffer();
  }

  // ============ DISTRIBUSI PESERTA ============

  static async getDistribusi(ujianId: string) {
    const list = await db.select({
      distribusi: distribusiPeserta,
      ruang: ruangUjian,
      siswa: studentProfiles,
      className: classes.name
    })
      .from(distribusiPeserta)
      .leftJoin(ruangUjian, eq(distribusiPeserta.ruangId, ruangUjian.id))
      .leftJoin(studentProfiles, eq(distribusiPeserta.siswaId, studentProfiles.id))
      .leftJoin(classes, eq(studentProfiles.classId, classes.id))

      .where(eq(distribusiPeserta.ujianId, ujianId))
      .orderBy(asc(ruangUjian.namaRuang), asc(distribusiPeserta.nomorMeja));

    return list.map(item => {
      const cName = item.className || item.siswa?.className || '';
      let fullClassName = cName;

      return {
        ...item.distribusi,
        ruang: item.ruang,
        siswa: {
          ...item.siswa,
          fullClassName, // enhanced class name with major
        }
      };
    });
  }

  static async generateDistribusi(
    ujianId: string,
    mode: 'kelas' | 'acak' | 'urut',
    kelasIds?: string[],
    roomAssignments?: { ruangId: string; kelasIds: string[] }[]
  ) {
    // Get ruang
    const ruangList = await this.getRuang(ujianId);
    if (ruangList.length === 0) throw new Error('Belum ada ruang ujian');

    // Clear existing distribusi
    await db.delete(distribusiPeserta).where(eq(distribusiPeserta.ujianId, ujianId));

    const assignments: any[] = [];

    // ===== NEW: Room-specific class mapping (drag & drop mode) =====
    if (roomAssignments && roomAssignments.length > 0) {
      for (const ra of roomAssignments) {
        if (!ra.kelasIds || ra.kelasIds.length === 0) continue;

        const ruang = ruangList.find(r => r.id === ra.ruangId);
        if (!ruang) continue;

        // Get students for these classes
        let students = await db.select()
          .from(studentProfiles)
          .where(and(
            eq(studentProfiles.status, 'active'),
            inArray(studentProfiles.classId as any, ra.kelasIds)
          ))
          .orderBy(asc(studentProfiles.fullName));

        // Fallback: try without status filter
        if (students.length === 0) {
          students = await db.select()
            .from(studentProfiles)
            .where(inArray(studentProfiles.classId as any, ra.kelasIds))
            .orderBy(asc(studentProfiles.fullName));
        }

        // Sort based on mode
        if (mode === 'acak') {
          for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [students[i], students[j]] = [students[j], students[i]];
          }
        } else if (mode === 'urut') {
          students.sort((a, b) => (a.nis || '').localeCompare(b.nis || ''));
        }

        students.forEach((student, idx) => {
          assignments.push({
            id: uuidv4(),
            ujianId,
            ruangId: ra.ruangId,
            siswaId: student.id,
            nomorMeja: idx + 1
          });
        });
      }

      if (assignments.length > 0) {
        await db.insert(distribusiPeserta).values(assignments);
      }
      return { distributed: assignments.length };
    }

    // ===== LEGACY: Auto-distribute to all rooms =====
    // Get students (active only)
    let studentList: any[];
    if (kelasIds && kelasIds.length > 0) {
      studentList = await db.select()
        .from(studentProfiles)
        .where(and(
          eq(studentProfiles.status, 'active'),
          inArray(studentProfiles.classId as any, kelasIds)
        ))
        .orderBy(asc(studentProfiles.fullName));
    } else {
      studentList = await db.select()
        .from(studentProfiles)
        .where(eq(studentProfiles.status, 'active'))
        .orderBy(asc(studentProfiles.fullName));
    }

    // Also include students with 'Aktif' status (case variants)
    if (studentList.length === 0) {
      if (kelasIds && kelasIds.length > 0) {
        studentList = await db.select()
          .from(studentProfiles)
          .where(inArray(studentProfiles.classId as any, kelasIds))
          .orderBy(asc(studentProfiles.fullName));
      } else {
        studentList = await db.select()
          .from(studentProfiles)
          .orderBy(asc(studentProfiles.fullName));
      }
    }

    if (studentList.length === 0) throw new Error('Tidak ada siswa yang tersedia');

    // Sort based on mode
    let sortedStudents = [...studentList];
    if (mode === 'acak') {
      for (let i = sortedStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedStudents[i], sortedStudents[j]] = [sortedStudents[j], sortedStudents[i]];
      }
    } else if (mode === 'urut') {
      sortedStudents.sort((a, b) => (a.nis || '').localeCompare(b.nis || ''));
    }

    // Distribute students to rooms
    let ruangIdx = 0;
    let mejaCounter: Record<string, number> = {};

    for (const student of sortedStudents) {
      let placed = false;
      for (let attempt = 0; attempt < ruangList.length; attempt++) {
        const currentRuang = ruangList[ruangIdx % ruangList.length];
        const currentCount = mejaCounter[currentRuang.id] || 0;

        if (currentCount < currentRuang.kapasitas) {
          mejaCounter[currentRuang.id] = currentCount + 1;
          assignments.push({
            id: uuidv4(),
            ujianId,
            ruangId: currentRuang.id,
            siswaId: student.id,
            nomorMeja: currentCount + 1
          });
          placed = true;
          if (currentCount + 1 >= currentRuang.kapasitas) {
            ruangIdx++;
          }
          break;
        }
        ruangIdx++;
      }

      if (!placed) {
        const lastRuang = ruangList[ruangList.length - 1];
        const currentCount = mejaCounter[lastRuang.id] || 0;
        mejaCounter[lastRuang.id] = currentCount + 1;
        assignments.push({
          id: uuidv4(),
          ujianId,
          ruangId: lastRuang.id,
          siswaId: student.id,
          nomorMeja: currentCount + 1
        });
      }
    }

    if (assignments.length > 0) {
      await db.insert(distribusiPeserta).values(assignments);
    }

    return { distributed: assignments.length };
  }

  static async clearDistribusi(ujianId: string) {
    return await db.delete(distribusiPeserta).where(eq(distribusiPeserta.ujianId, ujianId));
  }

  static async exportDistribusiExcel(ujianId: string, ruangId?: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = (ujianData.pengaturan as any) || {};
    const kop = config.kop || {};
    const distribusiTtd = config.distribusiTtd || config.ttd || {};

    const distribusi = await this.getDistribusi(ujianId);
    let ruangList = await this.getRuang(ujianId);

    // Filter by specific room if requested
    if (ruangId) {
      ruangList = ruangList.filter(r => r.id === ruangId);
    }

    const workbook = new ExcelJS.Workbook();
    const totalCols = 7; // No, NIS, NISN, NAMA SISWA, L/P, TEMPAT LAHIR, TANGGAL LAHIR

    const thinBorder: any = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    for (const ruang of ruangList) {
      const ruangStudents = distribusi.filter((d: any) => d.ruangId === ruang.id);
      if (ruangStudents.length === 0) continue;

      // Determine classes in this room
      const classNames = [...new Set(ruangStudents.map((d: any) => d.siswa?.fullClassName || d.siswa?.className || '-'))];
      const classLabel = classNames.join(', ');

      const sheetName = (ruang.namaRuang || 'Ruang').substring(0, 31); // Excel sheet name max 31 chars
      const sheet = workbook.addWorksheet(sheetName);

      // ===== KOP SURAT =====
      sheet.mergeCells(1, 1, 1, totalCols);
      sheet.getCell(1, 1).value = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
      sheet.getCell(1, 1).font = { bold: true, size: 11 };
      sheet.getCell(1, 1).alignment = { horizontal: 'center' };

      sheet.mergeCells(2, 1, 2, totalCols);
      sheet.getCell(2, 1).value = kop.instansi || 'MADRASAH ALIYAH NEGERI 2 LOMBOK TIMUR';
      sheet.getCell(2, 1).font = { bold: true, size: 13 };
      sheet.getCell(2, 1).alignment = { horizontal: 'center' };

      sheet.mergeCells(3, 1, 3, totalCols);
      sheet.getCell(3, 1).value = kop.panitia || `PANITIA ${ujianData.namaUjian?.toUpperCase() || 'UJIAN'}`;
      sheet.getCell(3, 1).font = { bold: true, size: 11 };
      sheet.getCell(3, 1).alignment = { horizontal: 'center' };

      sheet.mergeCells(4, 1, 4, totalCols);
      sheet.getCell(4, 1).value = `TAHUN PELAJARAN ${ujianData.tahunAjaran || '-'}`;
      sheet.getCell(4, 1).font = { bold: true, size: 11 };
      sheet.getCell(4, 1).alignment = { horizontal: 'center' };

      sheet.mergeCells(5, 1, 5, totalCols);
      sheet.getCell(5, 1).value = kop.alamat || 'Alamat';
      sheet.getCell(5, 1).font = { italic: true, size: 9 };
      sheet.getCell(5, 1).alignment = { horizontal: 'center' };

      // Double line under kop
      for (let c = 1; c <= totalCols; c++) {
        sheet.getCell(5, c).border = { bottom: { style: 'double' } };
      }

      // Add logos to kop surat
      await this.addLogosToSheet(workbook, sheet, totalCols);

      // ===== TITLE =====
      sheet.addRow([]); // row 6 spacer

      sheet.mergeCells(7, 1, 7, totalCols);
      sheet.getCell(7, 1).value = `DATA PESERTA ${ujianData.namaUjian?.toUpperCase() || 'UJIAN'}`;
      sheet.getCell(7, 1).font = { bold: true, size: 11 };
      sheet.getCell(7, 1).alignment = { horizontal: 'center' };

      sheet.mergeCells(8, 1, 8, totalCols);
      sheet.getCell(8, 1).value = `RUANG : ${ruang.namaRuang}   KELAS ${classLabel}`;
      sheet.getCell(8, 1).font = { bold: true, size: 11 };
      sheet.getCell(8, 1).alignment = { horizontal: 'center' };

      sheet.addRow([]); // row 9 spacer

      // ===== TABLE HEADER =====
      const headerRow = 10;
      const headers = ['No', 'NIS', 'NISN', 'NAMA SISWA', 'L/P', 'TEMPAT LAHIR', 'TANGGAL LAHIR'];
      headers.forEach((h, idx) => {
        const cell = sheet.getCell(headerRow, idx + 1);
        cell.value = h;
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      });

      // ===== DATA ROWS =====
      ruangStudents.forEach((row: any, i: number) => {
        const dataRow = headerRow + 1 + i;
        const siswa = row.siswa || {};
        const gender = (siswa.gender || '').toLowerCase();
        const lp = gender.includes('laki') ? 'Laki-laki' : gender.includes('perempuan') ? 'Perempuan' : siswa.gender || '-';

        const rowData = [
          i + 1,
          siswa.nis || '-',
          siswa.nisn || '-',
          siswa.fullName || '-',
          lp,
          siswa.birthPlace || '-',
          siswa.birthDate || '-'
        ];

        rowData.forEach((val, idx) => {
          const cell = sheet.getCell(dataRow, idx + 1);
          cell.value = val;
          cell.font = { size: 10 };
          cell.border = thinBorder;
          cell.alignment = { vertical: 'middle', ...(idx === 0 ? { horizontal: 'center' } : {}) };
        });
      });

      // ===== SIGNATURE =====
      const lastDataRow = headerRow + 1 + ruangStudents.length;
      const ttdStartRow = lastDataRow + 2;

      const dStr = distribusiTtd.tanggal
        ? new Date(distribusiTtd.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      const ttdLocation = `${distribusiTtd.tempat || 'Wanasaba'}, ${dStr}`;

      sheet.mergeCells(ttdStartRow, 4, ttdStartRow, totalCols);
      sheet.getCell(ttdStartRow, 4).value = ttdLocation;
      sheet.getCell(ttdStartRow, 4).alignment = { horizontal: 'center' };
      sheet.getCell(ttdStartRow, 4).font = { size: 10 };

      sheet.mergeCells(ttdStartRow + 1, 4, ttdStartRow + 1, totalCols);
      sheet.getCell(ttdStartRow + 1, 4).value = distribusiTtd.jabatan || 'Ketua Panitia';
      sheet.getCell(ttdStartRow + 1, 4).alignment = { horizontal: 'center' };
      sheet.getCell(ttdStartRow + 1, 4).font = { size: 10 };

      // Space for signature
      sheet.mergeCells(ttdStartRow + 5, 4, ttdStartRow + 5, totalCols);
      sheet.getCell(ttdStartRow + 5, 4).value = distribusiTtd.nama || '';
      sheet.getCell(ttdStartRow + 5, 4).alignment = { horizontal: 'center' };
      sheet.getCell(ttdStartRow + 5, 4).font = { bold: true, size: 10 };

      sheet.mergeCells(ttdStartRow + 6, 4, ttdStartRow + 6, totalCols);
      sheet.getCell(ttdStartRow + 6, 4).value = distribusiTtd.nip ? `NIP. ${distribusiTtd.nip}` : '';
      sheet.getCell(ttdStartRow + 6, 4).alignment = { horizontal: 'center' };
      sheet.getCell(ttdStartRow + 6, 4).font = { size: 10 };

      // Column widths
      sheet.getColumn(1).width = 5;   // No
      sheet.getColumn(2).width = 12;  // NIS
      sheet.getColumn(3).width = 15;  // NISN
      sheet.getColumn(4).width = 30;  // NAMA SISWA
      sheet.getColumn(5).width = 12;  // L/P
      sheet.getColumn(6).width = 22;  // TEMPAT LAHIR
      sheet.getColumn(7).width = 15;  // TANGGAL LAHIR
    }

    if (workbook.worksheets.length === 0) {
      throw new Error('Tidak ada data distribusi untuk di-export');
    }

    return await workbook.xlsx.writeBuffer();
  }

  static async exportDaftarHadirExcel(ujianId: string, ruangId?: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = (ujianData.pengaturan as any) || {};
    const distribusi = await this.getDistribusi(ujianId);
    let ruangList = await this.getRuang(ujianId);
    const jadwalList = await this.getJadwal(ujianId);
    const pengawasData = await this.getPengawas(ujianId);

    if (ruangId) {
      ruangList = ruangList.filter(r => r.id === ruangId);
    }

    // Get employee data for pengawas resolution
    const group1 = config.pengawasGroups?.group1 || [];
    const group2 = config.pengawasGroups?.group2 || [];
    const allEmpIds = [...new Set([...group1, ...group2])];
    const employeesData = allEmpIds.length > 0
      ? await db.select().from(employees).where(inArray(employees.id, allEmpIds))
      : [];
    const employeeMap = new Map(employeesData.map(e => [e.id, e]));

    // Helper to resolve employee from kodeLabel
    const getEmpByKodeLabel = (kodeLabel: string) => {
      if (!kodeLabel) return null;
      const isNum = /^\d+$/.test(kodeLabel);
      let empId = null;
      if (isNum) {
        const idx = parseInt(kodeLabel, 10) - 1;
        empId = group1[idx];
      } else {
        const idx = kodeLabel.charCodeAt(0) - 65;
        empId = group2[idx];
      }
      return empId ? employeeMap.get(empId) || null : null;
    };

    const namaUjian = (ujianData.namaUjian || (ujianData as any).jenisUjian || 'UJIAN').toUpperCase();
    const tahunAjaran = ujianData.tahunAjaran || '';
    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const workbook = new ExcelJS.Workbook();
    const totalCols = 5; // No, No. Peserta Ujian, Nama Peserta, Tanda Tangan Peserta (2 columns)

    const thinBorder: any = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    // Generate one sheet per jadwal × ruang combination
    for (const jad of jadwalList) {
      for (const rng of ruangList) {
        const studentsInRoomTemp = distribusi.filter((d: any) => d.ruangId === rng.id);
        if (studentsInRoomTemp.length === 0) continue;
        const studentsInRoom = studentsInRoomTemp.map((d: any, idx: number) => ({ ...d, urutRuang: idx + 1 }));

        // Get pengawas for this jadwal+ruang
        const tugas = pengawasData.filter((p: any) => p.jadwalId === jad.id && p.ruangId === rng.id);
        let pengawas1: any = null;
        let pengawas2: any = null;
        for (const t of tugas) {
          const kl = (t.kodeLabel || '') as string;
          if (/^\d+$/.test(kl)) {
            pengawas1 = getEmpByKodeLabel(kl);
          } else {
            pengawas2 = getEmpByKodeLabel(kl);
          }
        }

        // Determine classes in room
        const classNames = [...new Set(studentsInRoom.map((d: any) => d.siswa?.fullClassName || d.siswa?.className || '-'))];
        const classLabel = classNames.join(', ');

        // Date info
        const d = jad.tanggal ? new Date(jad.tanggal) : null;
        const hariStr = d ? hariNames[d.getDay()] : '';
        const tglStr = d ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

        const mapelStr = jad.mataPelajaran || '';
        let sheetName = `${mapelStr ? mapelStr.substring(0, 15) : 'DH'}-${rng.namaRuang || 'R'}`.substring(0, 31);
        // Ensure unique sheet name
        const existingNames = workbook.worksheets.map(ws => ws.name);
        if (existingNames.includes(sheetName)) {
          let counter = 2;
          while (existingNames.includes(`${sheetName.substring(0, 28)}_${counter}`)) {
            counter++;
          }
          sheetName = `${sheetName.substring(0, 28)}_${counter}`;
        }
        const sheet = workbook.addWorksheet(sheetName);

        // ===== JUDUL (3 baris, center, bold) =====
        sheet.mergeCells(1, 1, 1, totalCols);
        sheet.getCell(1, 1).value = 'DAFTAR HADIR SISWA';
        sheet.getCell(1, 1).font = { bold: true, size: 12 };
        sheet.getCell(1, 1).alignment = { horizontal: 'center' };

        sheet.mergeCells(2, 1, 2, totalCols);
        sheet.getCell(2, 1).value = `PELAKSANAAN ${namaUjian}`;
        sheet.getCell(2, 1).font = { bold: true, size: 12 };
        sheet.getCell(2, 1).alignment = { horizontal: 'center' };

        sheet.mergeCells(3, 1, 3, totalCols);
        sheet.getCell(3, 1).value = `TAHUN AJARAN ${tahunAjaran}`;
        sheet.getCell(3, 1).font = { bold: true, size: 12 };
        sheet.getCell(3, 1).alignment = { horizontal: 'center' };

        sheet.addRow([]); // row 4 spacer

        // ===== IDENTITAS (row 5 & 6) =====
        // Row 5: Mata Pelajaran : _____ Ruang/Kelas : _____ / _____
        sheet.mergeCells(5, 1, 5, totalCols);
        sheet.getCell(5, 1).value = `Mata Pelajaran   :  ${mapelStr || '___________________'}                    Ruang :  ${rng.namaRuang || '______'}  /  ${classLabel || '______'}`;
        sheet.getCell(5, 1).font = { size: 10 };

        // Row 6: Hari / Tanggal : _____ Jam ke/Waktu: _____ / _____
        sheet.mergeCells(6, 1, 6, totalCols);
        sheet.getCell(6, 1).value = `Hari / Tanggal    :  ${hariStr ? hariStr + ', ' + tglStr : '___________________'}                    Jam ke/Waktu:  ${(jad as any).sesi || '_'} / ${jad.waktuMulai || '____'} - ${jad.waktuSelesai || '____'}`;
        sheet.getCell(6, 1).font = { size: 10 };

        sheet.addRow([]); // row 7 spacer

        // ===== TABLE HEADER (row 8) =====
        const headerRow = 8;
        sheet.getCell(headerRow, 1).value = 'No';
        sheet.getCell(headerRow, 2).value = 'No. Peserta Ujian';
        sheet.getCell(headerRow, 3).value = 'Nama Peserta';
        sheet.mergeCells(headerRow, 4, headerRow, 5);
        sheet.getCell(headerRow, 4).value = 'Tanda Tangan Peserta';

        for (let c = 1; c <= 5; c++) {
          const cell = sheet.getCell(headerRow, c);
          cell.font = { bold: true, size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
        }
        sheet.getRow(headerRow).height = 22;

        // ===== DATA ROWS =====
        studentsInRoom.forEach((row: any, i: number) => {
          const dataRow = headerRow + 1 + i;
          const siswa = row.siswa || {};
          const nomor = i + 1;

          // Generate nomor peserta kustom
          const lastYearStr = tahunAjaran.length >= 2 ? tahunAjaran.slice(-2) : '00';
          const semesterLower = (ujianData.semester || '').toLowerCase();
          const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
          const kelasStr2 = (siswa.fullClassName || siswa.className || '').toUpperCase();
          let gradeCode = '00';
          if (kelasStr2.includes('XII') || kelasStr2.includes('12')) gradeCode = '12';
          else if (kelasStr2.includes('XI') || kelasStr2.includes('11')) gradeCode = '11';
          else if (kelasStr2.includes('X') || kelasStr2.includes('10')) gradeCode = '10';
          const ruangMatch = (rng.namaRuang || '').match(/\d+/);
          const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
          const ruangCode = ruangNumber.toString().padStart(2, '0');
          const urutCode = (row.urutRuang || nomor).toString().padStart(3, '0');
          const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

          // No
          const cellNo = sheet.getCell(dataRow, 1);
          cellNo.value = `${nomor}.`;
          cellNo.font = { size: 10 };
          cellNo.border = thinBorder;
          cellNo.alignment = { horizontal: 'center', vertical: 'middle' };

          // No. Peserta Ujian
          const cellNoPeserta = sheet.getCell(dataRow, 2);
          cellNoPeserta.value = nomorPeserta;
          cellNoPeserta.font = { size: 10 };
          cellNoPeserta.border = thinBorder;
          cellNoPeserta.alignment = { vertical: 'middle', horizontal: 'left' };

          // Nama Peserta
          const cellNama = sheet.getCell(dataRow, 3);
          cellNama.value = siswa.fullName || '';
          cellNama.font = { size: 10 };
          cellNama.border = thinBorder;
          cellNama.alignment = { vertical: 'middle', horizontal: 'left' };

          // Tanda Tangan Peserta
          const cellTtd1 = sheet.getCell(dataRow, 4);
          const cellTtd2 = sheet.getCell(dataRow, 5);
          cellTtd1.border = thinBorder;
          cellTtd2.border = thinBorder;
          cellTtd1.font = { size: 10 };
          cellTtd2.font = { size: 10 };
          
          if (nomor % 2 === 1) {
            cellTtd1.value = `${nomor}.`;
            cellTtd1.alignment = { horizontal: 'left', vertical: 'top' };
            cellTtd2.value = '';
          } else {
            cellTtd2.value = `${nomor}.`;
            cellTtd2.alignment = { horizontal: 'left', vertical: 'top' };
            cellTtd1.value = '';
          }
        });

        // ===== Add empty rows if less than 12 to fill page =====
        const minRows = 12;
        if (studentsInRoom.length < minRows) {
          for (let i = studentsInRoom.length; i < minRows; i++) {
            const dataRow = headerRow + 1 + i;
            const nomor = i + 1;
            const cellNo = sheet.getCell(dataRow, 1);
            cellNo.value = `${nomor}.`;
            cellNo.font = { size: 10 };
            cellNo.border = thinBorder;
            cellNo.alignment = { horizontal: 'center', vertical: 'middle' };

            for (let c = 2; c <= 3; c++) {
              const cell = sheet.getCell(dataRow, c);
              cell.value = '';
              cell.border = thinBorder;
            }

            const cellTtd1 = sheet.getCell(dataRow, 4);
            const cellTtd2 = sheet.getCell(dataRow, 5);
            cellTtd1.border = thinBorder;
            cellTtd2.border = thinBorder;
            cellTtd1.font = { size: 10 };
            cellTtd2.font = { size: 10 };
            
            if (nomor % 2 === 1) {
              cellTtd1.value = `${nomor}.`;
              cellTtd1.alignment = { horizontal: 'left', vertical: 'top' };
              cellTtd2.value = '';
            } else {
              cellTtd2.value = `${nomor}.`;
              cellTtd2.alignment = { horizontal: 'left', vertical: 'top' };
              cellTtd1.value = '';
            }
          }
        }

        const actualRows = Math.max(studentsInRoom.length, minRows);

        // Set row heights for data
        for (let i = 0; i < actualRows; i++) {
          sheet.getRow(headerRow + 1 + i).height = 28;
        }

        // ===== PENGAWAS SIGNATURE (bottom) =====
        const ttdStartRow = headerRow + 1 + actualRows + 2;

        // Pengawas I label (col 1-2)
        sheet.mergeCells(ttdStartRow, 1, ttdStartRow, 2);
        sheet.getCell(ttdStartRow, 1).value = 'Pengawas I';
        sheet.getCell(ttdStartRow, 1).font = { bold: true, size: 10 };
        sheet.getCell(ttdStartRow, 1).alignment = { horizontal: 'center' };

        // Pengawas II label (col 4-5)
        sheet.mergeCells(ttdStartRow, 4, ttdStartRow, 5);
        sheet.getCell(ttdStartRow, 4).value = 'Pengawas II';
        sheet.getCell(ttdStartRow, 4).font = { bold: true, size: 10 };
        sheet.getCell(ttdStartRow, 4).alignment = { horizontal: 'center' };

        // Space for signatures (3 empty rows)
        const signRow = ttdStartRow + 4;

        // Pengawas I name
        sheet.mergeCells(signRow, 1, signRow, 2);
        sheet.getCell(signRow, 1).value = pengawas1 ? `( ${pengawas1.name} )` : '(                                 )';
        sheet.getCell(signRow, 1).font = { size: 10 };
        sheet.getCell(signRow, 1).alignment = { horizontal: 'center' };

        // Pengawas I NIP
        sheet.mergeCells(signRow + 1, 1, signRow + 1, 2);
        sheet.getCell(signRow + 1, 1).value = pengawas1?.nip ? `NIP. ${pengawas1.nip}` : 'NIP.';
        sheet.getCell(signRow + 1, 1).font = { size: 9 };
        sheet.getCell(signRow + 1, 1).alignment = { horizontal: 'center' };

        // Pengawas II name
        sheet.mergeCells(signRow, 4, signRow, 5);
        sheet.getCell(signRow, 4).value = pengawas2 ? `( ${pengawas2.name} )` : '(                                 )';
        sheet.getCell(signRow, 4).font = { size: 10 };
        sheet.getCell(signRow, 4).alignment = { horizontal: 'center' };

        // Pengawas II NIP
        sheet.mergeCells(signRow + 1, 4, signRow + 1, 5);
        sheet.getCell(signRow + 1, 4).value = pengawas2?.nip ? `NIP. ${pengawas2.nip}` : 'NIP.';
        sheet.getCell(signRow + 1, 4).font = { size: 9 };
        sheet.getCell(signRow + 1, 4).alignment = { horizontal: 'center' };

        // ===== Column widths =====
        sheet.getColumn(1).width = 5;    // No
        sheet.getColumn(2).width = 22;   // No. Peserta Ujian
        sheet.getColumn(3).width = 25;   // Nama Peserta
        sheet.getColumn(4).width = 15;   // Tanda Tangan Peserta 1
        sheet.getColumn(5).width = 15;   // Tanda Tangan Peserta 2

        // ===== Print setup A4 =====
        sheet.pageSetup = {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.7, right: 0.7,
            top: 0.75, bottom: 0.75,
            header: 0.3, footer: 0.3
          }
        };
      }
    }

    if (workbook.worksheets.length === 0) {
      throw new Error('Tidak ada data untuk di-export. Pastikan jadwal, ruang, dan distribusi peserta sudah dikonfigurasi.');
    }

    return await workbook.xlsx.writeBuffer();
  }

  static async exportDaftarHadirPengawasExcel(ujianId: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = (ujianData.pengaturan as any) || {};
    const jadwalList = await this.getJadwal(ujianId);
    
    // Employee Data for Pengawas Groups
    const group1 = config.pengawasGroups?.group1 || [];
    const group2 = config.pengawasGroups?.group2 || [];
    const allEmpIds = [...new Set([...group1, ...group2])];
    
    const employeesData = allEmpIds.length > 0
      ? await db.select().from(employees).where(inArray(employees.id, allEmpIds)).orderBy(asc(employees.name))
      : [];

    const namaUjian = (ujianData.namaUjian || (ujianData as any).jenisUjian || 'UJIAN').toUpperCase();
    const tahunAjaran = ujianData.tahunAjaran || '';
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daftar Hadir Pengawas', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
      }
    });

    const thinBorder: any = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    // Group Jadwal Dates and Sessions
    const datesMap = new Map<string, Set<string>>();
    for (const j of jadwalList) {
       const tglStr = j.tanggal;
       if (!datesMap.has(tglStr)) datesMap.set(tglStr, new Set());
       datesMap.get(tglStr)!.add(j.waktuMulai);
    }
    
    const sortedDateObj = Array.from(datesMap.keys()).sort().map(d => {
       const wSet = datesMap.get(d)!;
       const sortedWaktu = Array.from(wSet).sort();
       return { date: d, sessions: sortedWaktu };
    });

    if (sortedDateObj.length === 0) {
      sortedDateObj.push({ date: new Date().toISOString().split('T')[0], sessions: ['07:30'] });
    }
    
    let sessionColsCount = 0;
    for (const d of sortedDateObj) {
      sessionColsCount += d.sessions.length;
    }
    if (sessionColsCount === 0) sessionColsCount = 1;
    
    const totalCols = 2 + sessionColsCount + 1; // No, Nama/NIP, ...sessions..., KET
    
    
    // Header KOP Text
    const configKop = config.kop || {};
    
    sheet.mergeCells(1, 1, 1, totalCols);
    sheet.getCell(1, 1).value = configKop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
    sheet.getCell(1, 1).font = { bold: true, size: 12 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(2, 1, 2, totalCols);
    sheet.getCell(2, 1).value = configKop.instansi || 'MADRASAH ALIYAH';
    sheet.getCell(2, 1).font = { bold: true, size: 14 };
    sheet.getCell(2, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell(3, 1).value = configKop.panitia || `PANITIA ${namaUjian} TAHUN AJARAN ${tahunAjaran}`;
    sheet.getCell(3, 1).font = { bold: true, size: 11 };
    sheet.getCell(3, 1).alignment = { horizontal: 'center' };

    sheet.mergeCells(4, 1, 4, totalCols);
    sheet.getCell(4, 1).value = configKop.alamat || 'Alamat';
    sheet.getCell(4, 1).font = { size: 10 };
    sheet.getCell(4, 1).alignment = { horizontal: 'center' };
    
    for (let c = 1; c <= totalCols; c++) {
       const cell = sheet.getCell(4, c);
       cell.border = { bottom: { style: 'double' } };
    }

    // Add logos to kop surat
    await this.addLogosToSheet(workbook, sheet, totalCols);

    sheet.addRow([]); // Spacer row 5

    // Title DAFTAR HADIR PENGAWAS
    sheet.mergeCells(6, 1, 6, totalCols);
    sheet.getCell(6, 1).value = 'DAFTAR HADIR PENGAWAS';
    sheet.getCell(6, 1).font = { bold: true, size: 14 };
    sheet.getCell(6, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(7, 1, 7, totalCols);
    sheet.getCell(7, 1).value = namaUjian;
    sheet.getCell(7, 1).font = { bold: true, size: 12 };
    sheet.getCell(7, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(8, 1, 8, totalCols);
    sheet.getCell(8, 1).value = `TAHUN AJARAN ${tahunAjaran}`;
    sheet.getCell(8, 1).font = { bold: true, size: 12 };
    sheet.getCell(8, 1).alignment = { horizontal: 'center' };

    sheet.addRow([]); // Spacer row 9
    
    // Table Header Structure
    sheet.mergeCells(10, 1, 12, 1);
    sheet.getCell(10, 1).value = 'NO';
    
    sheet.mergeCells(10, 2, 12, 2);
    sheet.getCell(10, 2).value = 'NAMA/NIP';
    
    sheet.mergeCells(10, totalCols, 12, totalCols);
    sheet.getCell(10, totalCols).value = 'KET.';
    
    if (sessionColsCount > 1) {
       sheet.mergeCells(10, 3, 10, 2 + sessionColsCount);
    }
    sheet.getCell(10, 3).value = 'TANDA TANGAN KEHADIRAN SESUAI HARI DAN JAM MENGAWAS';
    
    let currentCol = 3;
    const dateNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for (const d of sortedDateObj) {
       const ts = new Date(d.date);
       const dayName = dateNames[ts.getDay()];
       const displayDate = `${dayName}, ${ts.toLocaleDateString('id-ID')}`;
       
       if (d.sessions.length > 1) {
          sheet.mergeCells(11, currentCol, 11, currentCol + d.sessions.length - 1);
       }
       sheet.getCell(11, currentCol).value = displayDate;
       
       for (let i = 0; i < d.sessions.length; i++) {
          const romanSesi = ['I', 'II', 'III', 'IV', 'V', 'VI'][i] || (i+1).toString();
          sheet.getCell(12, currentCol + i).value = romanSesi;
       }
       currentCol += d.sessions.length;
    }
    
    // Default styling for table header
    for (let r = 10; r <= 12; r++) {
       for (let c = 1; c <= totalCols; c++) {
          const cell = sheet.getCell(r, c);
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = thinBorder;
       }
       sheet.getRow(r).height = 20;
    }
    
    // Data Rows
    let startDataRow = 13;
    // If no employees, at least render 5 empty rows
    const loopData = employeesData.length > 0 ? employeesData : Array.from({length: 5}).map(() => ({}));
    
    loopData.forEach((emp: any, index: number) => {
       const rIdx = startDataRow + index;
       const row = sheet.getRow(rIdx);
       
       // NO
       const cellNo = sheet.getCell(rIdx, 1);
       cellNo.value = index + 1;
       cellNo.alignment = { horizontal: 'center', vertical: 'middle' };
       cellNo.border = thinBorder;
       
       // NAMA / NIP
       const cellName = sheet.getCell(rIdx, 2);
       const nameVal = emp.name || '';
       let nipVal = emp.nip ? `NIP. ${emp.nip}` : (emp.name ? 'NIP. -' : '');
       if (nameVal && nipVal) {
          cellName.value = `${nameVal}\n${nipVal}`;
       } else {
          cellName.value = '';
       }
       cellName.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
       cellName.border = thinBorder;
       
       // TTD and KET
       for(let c = 3; c <= totalCols; c++) {
          const cttd = sheet.getCell(rIdx, c);
          cttd.border = thinBorder;
       }
       
       row.height = 35;
    });
    
    // Widths
    sheet.getColumn(1).width = 5; // NO
    sheet.getColumn(2).width = 30; // NAMA/NIP
    for (let c = 3; c < totalCols; c++) {
       sheet.getColumn(c).width = 12; 
    }
    sheet.getColumn(totalCols).width = 8; // KET
    
    // Signature block
    const distribTtd = config.ttd || {}; 
    const ttdRow = startDataRow + loopData.length + 2;
    const ttdColStart = Math.max(3, totalCols - 3);
    
    let tglStr = distribTtd.tanggal;
    try {
      if (tglStr) {
         const tDate = new Date(tglStr);
         const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
         tglStr = `${tDate.getDate()} ${months[tDate.getMonth()]} ${tDate.getFullYear()}`;
      }
    } catch(e) {}
    
    sheet.mergeCells(ttdRow, ttdColStart, ttdRow, totalCols);
    sheet.getCell(ttdRow, ttdColStart).value = `${distribTtd.tempat || '..............'}, ${tglStr || '......................'}`;
    sheet.getCell(ttdRow, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 1, ttdColStart, ttdRow + 1, totalCols);
    sheet.getCell(ttdRow + 1, ttdColStart).value = distribTtd.jabatan || 'Kepala Madrasah';
    sheet.getCell(ttdRow + 1, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 5, ttdColStart, ttdRow + 5, totalCols);
    sheet.getCell(ttdRow + 5, ttdColStart).value = distribTtd.nama || '(...........................)';
    sheet.getCell(ttdRow + 5, ttdColStart).font = { bold: true };
    sheet.getCell(ttdRow + 5, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 6, ttdColStart, ttdRow + 6, totalCols);
    sheet.getCell(ttdRow + 6, ttdColStart).value = distribTtd.nip ? `NIP. ${distribTtd.nip}` : '';
    sheet.getCell(ttdRow + 6, ttdColStart).alignment = { horizontal: 'center' };

    return await workbook.xlsx.writeBuffer();
  }



  static async exportDaftarHadirPanitiaExcel(ujianId: string) {
    const ujianData = await db.query.ujian.findFirst({
      where: eq(ujian.id, ujianId),
    });
    if (!ujianData) throw new Error("Ujian tidak ditemukan");

    const namaUjian = ujianData.namaUjian;
    const tahunAjaran = ujianData.tahunAjaran;
    const config = (ujianData.pengaturan as any) || {};

    const panitiaDataRaw = await db.select({
      id: panitiaUjian.id,
      jabatan: panitiaUjian.jabatan,
      urutan: panitiaUjian.urutan,
      name: employees.name,
      nip: employees.nip
    }).from(panitiaUjian)
      .innerJoin(employees, eq(panitiaUjian.pegawaiId, employees.id))
      .where(eq(panitiaUjian.ujianId, ujianId));
      
    // Sort
    const panitiaData = panitiaDataRaw.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    const jadwalList = await db.query.jadwalUjian.findMany({
      where: eq(jadwalUjian.ujianId, ujianId),
    });

    const datesSet = new Set<string>();
    for (const j of jadwalList) {
       if (j.tanggal) datesSet.add(j.tanggal);
    }
    const sortedDateObj = Array.from(datesSet).sort();

    if (sortedDateObj.length === 0) {
      sortedDateObj.push(new Date().toISOString().split('T')[0]);
    }

    const sessionColsCount = sortedDateObj.length;
    const totalCols = 3 + sessionColsCount + 1; // NO, NAMA/NIP, JABATAN, ...dates..., KET

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daftar Hadir Panitia', {
       pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } }
    });

    // KOP
    const configKop = config.kop || {};
    
    sheet.mergeCells(1, 1, 1, totalCols);
    sheet.getCell(1, 1).value = configKop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
    sheet.getCell(1, 1).font = { bold: true, size: 12 };
    sheet.getCell(1, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(2, 1, 2, totalCols);
    sheet.getCell(2, 1).value = configKop.instansi || 'MADRASAH ALIYAH';
    sheet.getCell(2, 1).font = { bold: true, size: 14 };
    sheet.getCell(2, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell(3, 1).value = configKop.panitia || `PANITIA ${namaUjian} TAHUN AJARAN ${tahunAjaran}`;
    sheet.getCell(3, 1).font = { bold: true, size: 11 };
    sheet.getCell(3, 1).alignment = { horizontal: 'center' };

    sheet.mergeCells(4, 1, 4, totalCols);
    sheet.getCell(4, 1).value = configKop.alamat || 'Alamat';
    sheet.getCell(4, 1).font = { size: 10 };
    sheet.getCell(4, 1).alignment = { horizontal: 'center' };
    
    for (let c = 1; c <= totalCols; c++) {
       const cell = sheet.getCell(4, c);
       cell.border = { bottom: { style: 'double' } };
    }

    // Add logos to kop surat
    await this.addLogosToSheet(workbook, sheet, totalCols);

    sheet.addRow([]);

    // Title DAFTAR HADIR PANITIA
    sheet.mergeCells(6, 1, 6, totalCols);
    sheet.getCell(6, 1).value = 'DAFTAR HADIR PANITIA';
    sheet.getCell(6, 1).font = { bold: true, size: 14 };
    sheet.getCell(6, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(7, 1, 7, totalCols);
    sheet.getCell(7, 1).value = namaUjian;
    sheet.getCell(7, 1).font = { bold: true, size: 12 };
    sheet.getCell(7, 1).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(8, 1, 8, totalCols);
    sheet.getCell(8, 1).value = `TAHUN AJARAN ${tahunAjaran}`;
    sheet.getCell(8, 1).font = { bold: true, size: 12 };
    sheet.getCell(8, 1).alignment = { horizontal: 'center' };

    sheet.addRow([]); 
    
    // Table Header Structure (Rows 10 and 11)
    sheet.mergeCells(10, 1, 11, 1);
    sheet.getCell(10, 1).value = 'NO';
    
    sheet.mergeCells(10, 2, 11, 2);
    sheet.getCell(10, 2).value = 'NAMA/NIP';

    sheet.mergeCells(10, 3, 11, 3);
    sheet.getCell(10, 3).value = 'JABATAN KEPANITIAAN';
    
    sheet.mergeCells(10, totalCols, 11, totalCols);
    sheet.getCell(10, totalCols).value = 'KET.';
    
    if (sessionColsCount > 1) {
       sheet.mergeCells(10, 4, 10, 3 + sessionColsCount);
    }
    sheet.getCell(10, 4).value = 'TANDA TANGAN KEHADIRAN SESUAI HARI DAN JAM PENUGASAN';
    
    let currentCol = 4;
    const dateNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for (const d of sortedDateObj) {
       const ts = new Date(d);
       const dayName = dateNames[ts.getDay()];
       const displayDate = `${dayName}, ${ts.toLocaleDateString('id-ID')}`;
       
       sheet.getCell(11, currentCol).value = displayDate;
       currentCol += 1;
    }
    
    const thinBorder = {
       top: { style: 'thin' }, left: { style: 'thin' },
       bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    for (let r = 10; r <= 11; r++) {
       for (let c = 1; c <= totalCols; c++) {
          const cell = sheet.getCell(r, c);
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = thinBorder;
       }
       sheet.getRow(r).height = 20;
    }
    
    // Data Rows
    let startDataRow = 12;
    const loopData = panitiaData.length > 0 ? panitiaData : Array.from({length: 5}).map(() => ({}));
    
    loopData.forEach((emp: any, index: number) => {
       const rIdx = startDataRow + index;
       const row = sheet.getRow(rIdx);
       
       // NO
       const cellNo = sheet.getCell(rIdx, 1);
       cellNo.value = index + 1;
       cellNo.alignment = { horizontal: 'center', vertical: 'middle' };
       cellNo.border = thinBorder;
       
       // NAMA/NIP
       let fName = emp.name || '';
       let fnip = emp.nip ? `NIP. ${emp.nip}` : '';
       const cellName = sheet.getCell(rIdx, 2);
       if (fName) {
           cellName.value = { richText: [{ text: fName + '\n' }, { text: fnip, font: { size: 9 } }] };
       } else {
           cellName.value = '';
       }
       cellName.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
       cellName.border = thinBorder;

       // JABATAN
       const cellJab = sheet.getCell(rIdx, 3);
       cellJab.value = emp.jabatan || '';
       cellJab.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
       cellJab.border = thinBorder;
       cellJab.font = { bold: true, size: 10 };
       
       // TTD and KET
       for(let c = 4; c <= totalCols; c++) {
          const cttd = sheet.getCell(rIdx, c);
          cttd.border = thinBorder;
          if (c < totalCols) { // If it's a date/signature column
              cttd.value = '';
          }
       }
       
       row.height = 35;
    });
    
    // Widths
    sheet.getColumn(1).width = 5; 
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 15; 
    for (let c = 4; c < totalCols; c++) {
       sheet.getColumn(c).width = 15; 
    }
    sheet.getColumn(totalCols).width = 8; 
    
    // Signature block
    const distribTtd = config.ttd || {}; 
    const ttdRow = startDataRow + loopData.length + 2;
    const ttdColStart = Math.max(4, totalCols - 3);
    
    let tglStr = distribTtd.tanggal;
    try {
      if (tglStr) {
         const tDate = new Date(tglStr);
         const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
         tglStr = `${tDate.getDate()} ${months[tDate.getMonth()]} ${tDate.getFullYear()}`;
      }
    } catch(e) {}
    
    sheet.mergeCells(ttdRow, ttdColStart, ttdRow, totalCols);
    sheet.getCell(ttdRow, ttdColStart).value = `${distribTtd.tempat || '..............'}, ${tglStr || '......................'}`;
    sheet.getCell(ttdRow, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 1, ttdColStart, ttdRow + 1, totalCols);
    sheet.getCell(ttdRow + 1, ttdColStart).value = distribTtd.jabatan || 'Kepala Madrasah';
    sheet.getCell(ttdRow + 1, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 5, ttdColStart, ttdRow + 5, totalCols);
    sheet.getCell(ttdRow + 5, ttdColStart).value = distribTtd.nama || '(...........................)';
    sheet.getCell(ttdRow + 5, ttdColStart).font = { bold: true };
    sheet.getCell(ttdRow + 5, ttdColStart).alignment = { horizontal: 'center' };
    
    sheet.mergeCells(ttdRow + 6, ttdColStart, ttdRow + 6, totalCols);
    sheet.getCell(ttdRow + 6, ttdColStart).value = distribTtd.nip ? `NIP. ${distribTtd.nip}` : '';
    sheet.getCell(ttdRow + 6, ttdColStart).alignment = { horizontal: 'center' };

    return await workbook.xlsx.writeBuffer();
  }

  // ============ FORMAT NILAI (DAFTAR NILAI) ============

  static async exportFormatNilaiExcel(ujianId: string, filterMapel?: string, filterRuangId?: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = (ujianData.pengaturan as any) || {};
    const formatNilai = config.formatNilai || {};
    const defaultFmt = {
      tipe: 'campuran',
      jumlahPG: 40,
      jumlahEsai: 5,
      bobotPG: 60,
      bobotEsai: 40,
      kolomRemedial: false,
      ...formatNilai.default,
    };
    const perMapelFmt: Record<string, any> = formatNilai.perMapel || {};

    const getFormat = (mapel: string) => perMapelFmt[mapel] || defaultFmt;

    const jadwalList = await this.getJadwal(ujianId);
    const ruangList = await this.getRuang(ujianId);
    const distribusiAll = await this.getDistribusi(ujianId);

    if (jadwalList.length === 0) throw new Error('Belum ada jadwal ujian');
    if (ruangList.length === 0) throw new Error('Belum ada ruang ujian');

    // Build unique mapel list
    let mapelList = Array.from(new Set(jadwalList.map((j: any) => j.mataPelajaran).filter(Boolean)));
    if (filterMapel) {
      mapelList = mapelList.filter(m => m === filterMapel);
    }
    if (mapelList.length === 0) throw new Error('Tidak ada mata pelajaran yang cocok');

    // Filter rooms
    let roomsToProcess = ruangList;
    if (filterRuangId) {
      roomsToProcess = ruangList.filter((r: any) => r.id === filterRuangId);
    }

    const kop = config.kop || {};
    const namaUjian = (ujianData.namaUjian || 'UJIAN').toUpperCase();
    const tahunAjaran = ujianData.tahunAjaran || '';
    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const workbook = new ExcelJS.Workbook();

    const thinBorder: any = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };

    for (const mapel of mapelList) {
      const fmt = getFormat(mapel);
      const jadwalForMapel = jadwalList.filter((j: any) => j.mataPelajaran === mapel);
      const jadwalInfo = jadwalForMapel[0] as any;

      // Collect all kelas from jadwal for this mapel
      const kelasSet = new Set<string>();
      jadwalForMapel.forEach((j: any) => {
        if (j.kelas) {
          j.kelas.split(',').map((k: string) => k.trim()).filter(Boolean)
            .forEach((k: string) => kelasSet.add(k));
        }
      });
      const hasKelasFilter = kelasSet.size > 0;

      const showPG = fmt.tipe === 'pilihan_ganda' || fmt.tipe === 'campuran';
      const showEsai = fmt.tipe === 'esai' || fmt.tipe === 'campuran';

      for (const room of roomsToProcess) {
        let studentsInRoom = (distribusiAll as any[])
          .filter((d: any) => d.ruangId === room.id)
          .sort((a: any, b: any) => (a.siswa?.fullName || '').localeCompare(b.siswa?.fullName || ''));

        // Filter students by kelas from jadwal — only include students whose class
        // is listed in the jadwal for this mapel
        if (hasKelasFilter) {
          studentsInRoom = studentsInRoom.filter((d: any) => {
            const studentClass = d.siswa?.fullClassName || d.siswa?.className || '';
            return kelasSet.has(studentClass);
          });
        }

        if (studentsInRoom.length === 0) continue;

        // Sheet name (truncated to 31 chars for Excel)
        const sheetName = `${mapel} - ${room.namaRuang}`.substring(0, 31);
        const sheet = workbook.addWorksheet(sheetName, {
          pageSetup: {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.5, right: 0.5, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
          },
        });

        // Determine columns
        let totalCols = 3; // No, No.Peserta, Nama
        if (showPG) totalCols++;
        if (showEsai) totalCols++;
        totalCols++; // Nilai Akhir
        if (fmt.kolomRemedial) totalCols++;

        // === KOP SURAT ===
        sheet.mergeCells(1, 1, 1, totalCols);
        sheet.getCell(1, 1).value = kop.kementerian || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA';
        sheet.getCell(1, 1).font = { bold: true, size: 12 };
        sheet.getCell(1, 1).alignment = { horizontal: 'center' };

        sheet.mergeCells(2, 1, 2, totalCols);
        sheet.getCell(2, 1).value = kop.instansi || 'MADRASAH ALIYAH NEGERI';
        sheet.getCell(2, 1).font = { bold: true, size: 14 };
        sheet.getCell(2, 1).alignment = { horizontal: 'center' };

        sheet.mergeCells(3, 1, 3, totalCols);
        sheet.getCell(3, 1).value = `PANITIA ${namaUjian} TAHUN AJARAN ${tahunAjaran}`;
        sheet.getCell(3, 1).font = { bold: true, size: 11 };
        sheet.getCell(3, 1).alignment = { horizontal: 'center' };

        sheet.mergeCells(4, 1, 4, totalCols);
        sheet.getCell(4, 1).value = kop.alamat || 'Alamat Sekolah';
        sheet.getCell(4, 1).font = { size: 9 };
        sheet.getCell(4, 1).alignment = { horizontal: 'center' };

        // Double border
        for (let c = 1; c <= totalCols; c++) {
          sheet.getCell(4, c).border = { bottom: { style: 'double' } } as any;
        }

        // Logos
        await this.addLogosToSheet(workbook, sheet, totalCols);

        // === TITLE ===
        sheet.addRow([]); // row 5
        sheet.mergeCells(6, 1, 6, totalCols);
        sheet.getCell(6, 1).value = 'DAFTAR NILAI';
        sheet.getCell(6, 1).font = { bold: true, size: 14 };
        sheet.getCell(6, 1).alignment = { horizontal: 'center' };

        // Row heights for kop
        for (let r = 1; r <= 4; r++) sheet.getRow(r).height = 18;

        // === INFO ===
        let hariStr = '', tglStr = '';
        if (jadwalInfo?.tanggal) {
          const d = new Date(jadwalInfo.tanggal);
          hariStr = hariNames[d.getDay()];
          tglStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        }

        // Kelas from students
        const kelasFromStudents = Array.from(new Set(
          studentsInRoom.map((d: any) => d.siswa?.fullClassName || d.siswa?.className).filter(Boolean)
        )).join(', ');

        const infoStart = 8;
        const midCol = Math.ceil(totalCols / 2) + 1;

        sheet.getCell(infoStart, 1).value = 'Mata Pelajaran';
        sheet.getCell(infoStart, 2).value = `: ${mapel.toUpperCase()}`;
        sheet.getCell(infoStart, 2).font = { bold: true };
        sheet.getCell(infoStart, midCol).value = `Ruang: ${room.namaRuang}`;

        sheet.getCell(infoStart + 1, 1).value = 'Hari / Tanggal';
        sheet.getCell(infoStart + 1, 2).value = `: ${hariStr ? `${hariStr}, ${tglStr}` : '-'}`;
        sheet.getCell(infoStart + 1, midCol).value = `Waktu: ${jadwalInfo?.waktuMulai || ''} – ${jadwalInfo?.waktuSelesai || ''} WITA`;

        sheet.getCell(infoStart + 2, 1).value = 'Kelas';
        sheet.getCell(infoStart + 2, 2).value = `: ${kelasFromStudents || jadwalInfo?.kelas || '-'}`;
        const formatLabel = fmt.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' :
          fmt.tipe === 'esai' ? 'Esai' : `Campuran (PG ${fmt.bobotPG}% + Esai ${fmt.bobotEsai}%)`;
        sheet.getCell(infoStart + 2, midCol).value = `Format: ${formatLabel}`;

        for (let r = infoStart; r <= infoStart + 2; r++) {
          sheet.getRow(r).font = { size: 10 };
        }

        // === TABLE HEADER ===
        const headerRow = infoStart + 4;
        const headers: string[] = ['No', 'No. Peserta', 'Nama Peserta'];
        if (showPG) headers.push('PG');
        if (showEsai) headers.push('Esai');
        headers.push('Nilai Akhir');
        if (fmt.kolomRemedial) headers.push('Remedial');

        headers.forEach((h, idx) => {
          const cell = sheet.getCell(headerRow, idx + 1);
          cell.value = h;
          cell.font = { bold: true, size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
        });
        sheet.getRow(headerRow).height = 22;

        // === DATA ROWS ===
        let counter = 0;
        for (const student of studentsInRoom) {
          counter++;
          const dataRow = headerRow + counter;
          const siswa = student.siswa || {};

          // Generate nomor peserta
          const lastYearStr = (ujianData.tahunAjaran || '').length >= 2 ? (ujianData.tahunAjaran || '').slice(-2) : '00';
          const semesterLower = (ujianData.semester || '').toLowerCase();
          const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
          const kelasStr2 = (siswa.fullClassName || siswa.className || '').toUpperCase();
          let gradeCode = '00';
          if (kelasStr2.includes('XII') || kelasStr2.includes('12')) gradeCode = '12';
          else if (kelasStr2.includes('XI') || kelasStr2.includes('11')) gradeCode = '11';
          else if (kelasStr2.includes('X') || kelasStr2.includes('10')) gradeCode = '10';
          const ruangMatch = (room.namaRuang || '').match(/\d+/);
          const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
          const ruangCode = ruangNumber.toString().padStart(2, '0');
          const urutCode = counter.toString().padStart(3, '0');
          const nomorPeserta = `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;

          const rowData: (string | number)[] = [counter, nomorPeserta, siswa.fullName || '-'];
          if (showPG) rowData.push('');
          if (showEsai) rowData.push('');
          rowData.push(''); // Nilai Akhir
          if (fmt.kolomRemedial) rowData.push('');

          rowData.forEach((val, idx) => {
            const cell = sheet.getCell(dataRow, idx + 1);
            cell.value = val as any;
            cell.border = thinBorder;
            cell.font = { size: 10 };
            if (idx === 0) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (idx === 1) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.font = { size: 9, name: 'Courier New' };
            } else if (idx >= 3) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else {
              cell.alignment = { vertical: 'middle' };
            }
          });
          sheet.getRow(dataRow).height = 20;
        }

        // Add empty rows if less than 15
        const minRows = 15;
        if (counter < minRows) {
          for (let i = counter + 1; i <= minRows; i++) {
            const dataRow = headerRow + i;
            let colIdx = 0;
            [i.toString(), '', ''].concat(
              showPG ? [''] : [],
              showEsai ? [''] : [],
              [''],
              fmt.kolomRemedial ? [''] : []
            ).forEach((val, idx) => {
              const cell = sheet.getCell(dataRow, idx + 1);
              cell.value = idx === 0 ? i : '';
              cell.border = thinBorder;
              cell.font = { size: 10 };
              cell.alignment = idx === 0 ? { horizontal: 'center' } : {};
            });
          }
        }

        const actualRows = Math.max(counter, minRows);

        // === STATS ===
        const statsRow = headerRow + actualRows + 2;
        sheet.getCell(statsRow, 1).value = `Jumlah Peserta: ${counter} Orang`;
        sheet.getCell(statsRow, 1).font = { size: 10 };
        if (showPG) {
          sheet.getCell(statsRow, 3).value = `Jumlah Soal PG: ${fmt.jumlahPG}`;
          sheet.getCell(statsRow, 3).font = { size: 10 };
        }
        if (showEsai) {
          const esaiCol = showPG ? 4 : 3;
          sheet.getCell(statsRow, esaiCol).value = `Jumlah Soal Esai: ${fmt.jumlahEsai}`;
          sheet.getCell(statsRow, esaiCol).font = { size: 10 };
        }

        // === TTD: Guru Mata Pelajaran ===
        const ttdRow = statsRow + 2;
        const ttdCol = totalCols - 1;

        sheet.mergeCells(ttdRow, ttdCol, ttdRow, totalCols);
        sheet.getCell(ttdRow, ttdCol).value = 'Guru Mata Pelajaran';
        sheet.getCell(ttdRow, ttdCol).font = { size: 10 };
        sheet.getCell(ttdRow, ttdCol).alignment = { horizontal: 'center' };

        // Space for signature
        sheet.mergeCells(ttdRow + 4, ttdCol, ttdRow + 4, totalCols);
        sheet.getCell(ttdRow + 4, ttdCol).value = '(                                      )';
        sheet.getCell(ttdRow + 4, ttdCol).font = { size: 10 };
        sheet.getCell(ttdRow + 4, ttdCol).alignment = { horizontal: 'center' };

        sheet.mergeCells(ttdRow + 5, ttdCol, ttdRow + 5, totalCols);
        sheet.getCell(ttdRow + 5, ttdCol).value = 'NIP. ........................................';
        sheet.getCell(ttdRow + 5, ttdCol).font = { size: 9 };
        sheet.getCell(ttdRow + 5, ttdCol).alignment = { horizontal: 'center' };

        // === Column widths ===
        sheet.getColumn(1).width = 5;   // No
        sheet.getColumn(2).width = 22;  // No. Peserta
        sheet.getColumn(3).width = 30;  // Nama
        let colOffset = 4;
        if (showPG) { sheet.getColumn(colOffset).width = 10; colOffset++; }
        if (showEsai) { sheet.getColumn(colOffset).width = 10; colOffset++; }
        sheet.getColumn(colOffset).width = 14; colOffset++; // Nilai Akhir
        if (fmt.kolomRemedial) { sheet.getColumn(colOffset).width = 12; }
      }
    }

    if (workbook.worksheets.length === 0) {
      throw new Error('Tidak ada data untuk di-export. Pastikan jadwal, ruang, dan distribusi peserta sudah dikonfigurasi.');
    }

    return await workbook.xlsx.writeBuffer();
  }


  static async exportDaftarHadirPerKelasExcel(ujianId: string, kelasFilter?: string) {
    const ujianData = await this.getUjianById(ujianId);
    if (!ujianData) throw new Error('Ujian tidak ditemukan');

    const config = (ujianData.pengaturan as any) || {};
    const kop = config.kop || {};
    const distribusi = await this.getDistribusi(ujianId);
    const jadwalList = await this.getJadwal(ujianId);

    const namaUjian = (ujianData.namaUjian || (ujianData as any).jenisUjian || 'UJIAN').toUpperCase();
    const tahunAjaran = ujianData.tahunAjaran || '';
    const instansi = kop.instansi || 'MADRASAH ALIYAH NEGERI 2 LOMBOK TIMUR';
    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

    // Kumpulkan unique tanggal → sesi (waktu mulai) dari jadwal, sorted
    const dateSessionMap = new Map<string, string[]>();
    for (const j of jadwalList) {
      const tgl = (j.tanggal || '').split('T')[0];
      if (!tgl) continue;
      if (!dateSessionMap.has(tgl)) dateSessionMap.set(tgl, []);
      const wm = (j as any).waktuMulai || '';
      if (wm && !dateSessionMap.get(tgl)!.includes(wm)) {
        dateSessionMap.get(tgl)!.push(wm);
      }
    }
    // Sort tanggal dan sesi per tanggal
    const sortedDates = Array.from(dateSessionMap.keys()).sort().map(tgl => {
      const sessions = dateSessionMap.get(tgl)!.sort();
      return { tgl, sessions };
    });

    // Total kolom sesi = sum semua sesi per tanggal
    const totalSessionCols = sortedDates.reduce((s, d) => s + d.sessions.length, 0);
    // Kolom: URUT(1) + PESERTA(2) + NAMA(3) + LP(4) + sesi-kolom(5..)
    const fixedCols = 4;
    const totalCols = fixedCols + totalSessionCols;

    const thinBorder: any = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    const medBorder: any = {
      top: { style: 'medium' }, left: { style: 'medium' },
      bottom: { style: 'medium' }, right: { style: 'medium' }
    };

    // Kelompokkan distribusi per kelas
    const kelasMap = new Map<string, any[]>();
    for (const d of distribusi) {
      const kelas = (d.siswa?.fullClassName || d.siswa?.className || 'Tanpa Kelas').toUpperCase();
      if (!kelasMap.has(kelas)) kelasMap.set(kelas, []);
      kelasMap.get(kelas)!.push(d);
    }

    // Filter kelas jika ada
    const kelasList = kelasFilter
      ? Array.from(kelasMap.entries()).filter(([k]) => k === kelasFilter.toUpperCase())
      : Array.from(kelasMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    if (kelasList.length === 0) throw new Error('Tidak ada data kelas untuk di-export');

    const workbook = new ExcelJS.Workbook();

    for (const [namaKelas, siswaList] of kelasList) {
      // Sort siswa by fullName
      siswaList.sort((a, b) => (a.siswa?.fullName || '').localeCompare(b.siswa?.fullName || ''));

      // Tentukan info kelas
      const firstSiswa = siswaList[0]?.siswa || {};
      // Ambil jurusan dari nama kelas (bagian setelah tingkat, misal "XI IPA" → "IPA")
      const jurusan = namaKelas.replace(/^(XII|XI|X)\s*/i, '').trim() || '-';

      // Ruang (siswa bisa di ruang berbeda, ambil ruang pertama/terbanyak)
      const ruangCounts: Record<string, { nama: string; count: number }> = {};
      for (const d of siswaList) {
        const rId = d.ruangId || '';
        const rNama = d.ruang?.namaRuang || '-';
        if (!ruangCounts[rId]) ruangCounts[rId] = { nama: rNama, count: 0 };
        ruangCounts[rId].count++;
      }
      const dominantRuang = Object.values(ruangCounts).sort((a, b) => b.count - a.count)[0]?.nama || '-';

      // Nomor peserta helper
      const lastYearStr = tahunAjaran.length >= 2 ? tahunAjaran.slice(-2) : '00';
      const semesterLower = (ujianData.semester || '').toLowerCase();
      const semCode = semesterLower.includes('ganjil') ? '01' : semesterLower.includes('genap') ? '02' : '00';
      const kelasStr2 = namaKelas.toUpperCase();
      let gradeCode = '00';
      if (kelasStr2.includes('XII')) gradeCode = '12';
      else if (kelasStr2.includes('XI')) gradeCode = '11';
      else if (kelasStr2.startsWith('X')) gradeCode = '10';

      const makeNomor = (d: any, idx: number) => {
        const ruangMatch = (d.ruang?.namaRuang || '').match(/\d+/);
        const ruangNumber = ruangMatch ? parseInt(ruangMatch[0], 10) : 0;
        const ruangCode = ruangNumber.toString().padStart(2, '0');
        const urutCode = ((d.urutRuang || idx + 1)).toString().padStart(3, '0');
        return `${lastYearStr}-${semCode}-${gradeCode}-${ruangCode}-${urutCode}`;
      };

      const nomorFirst = makeNomor(siswaList[0], 0);
      const nomorLast = makeNomor(siswaList[siswaList.length - 1], siswaList.length - 1);

      // Format nama tingkat kelas (misal XI → SEBELAS)
      const tingkatMap: Record<string, string> = { 'X': 'SEPULUH', 'XI': 'SEBELAS', 'XII': 'DUA BELAS' };
      const tingkatMatch = namaKelas.match(/^(XII|XI|X)\b/i);
      const tingkatRoman = tingkatMatch ? tingkatMatch[1].toUpperCase() : '';
      const tingkatLengkap = tingkatMap[tingkatRoman] || tingkatRoman;
      const tingkatDisplay = tingkatRoman ? `${tingkatRoman} (${tingkatLengkap})` : namaKelas;

      const sheetName = namaKelas.substring(0, 31);
      const sheet = workbook.addWorksheet(sheetName, {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
        }
      });

      // ===== ROW 1-3: JUDUL =====
      const titleStyle = (row: number, val: string, size = 12) => {
        sheet.mergeCells(row, 1, row, totalCols);
        const cell = sheet.getCell(row, 1);
        cell.value = val;
        cell.font = { bold: true, size };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(row).height = 16;
      };
      titleStyle(1, 'DAFTAR HADIR PESERTA', 13);
      titleStyle(2, `${namaUjian} ${instansi}`, 12);
      titleStyle(3, `TAHUN AJARAN ${tahunAjaran}`, 12);

      // ===== ROW 5-6: INFO KELAS (kiri) + RUANG (kanan) =====
      const infoLabelStyle = { bold: false, size: 10 };
      const infoValueStyle = { bold: true, size: 10 };

      const setInfoRow = (row: number, label: string, value: string) => {
        sheet.mergeCells(row, 1, row, 2); // Merge col 1 & 2 for label
        sheet.getCell(row, 1).value = `${label} :`;
        sheet.getCell(row, 1).font = infoLabelStyle;
        sheet.mergeCells(row, 3, row, Math.floor(totalCols * 0.7)); // Value starts at col 3
        sheet.getCell(row, 3).value = value;
        sheet.getCell(row, 3).font = infoValueStyle;
        sheet.getRow(row).height = 14;
      };

      setInfoRow(5, 'KELAS / JURUSAN', `${tingkatDisplay} / ${jurusan}`);
      setInfoRow(6, 'NOMOR PESERTA', `${nomorFirst} S/D ${nomorLast}`);

      // RUANG di kanan (row 5-6, merge)
      const ruangStartCol = Math.floor(totalCols * 0.75);
      sheet.mergeCells(5, ruangStartCol, 6, totalCols);
      const cellRuang = sheet.getCell(5, ruangStartCol);
      cellRuang.value = `RUANG : ${dominantRuang}`;
      cellRuang.font = { bold: true, size: 14 };
      cellRuang.alignment = { horizontal: 'right', vertical: 'middle' };

      // ===== ROW 8: Spacer =====
      sheet.getRow(8).height = 4;

      // ===== HEADER TABEL: ROW 9, 10, 11 =====
      const HR1 = 9; // Row header level 1
      const HR2 = 10; // Row header level 2 (tanggal)
      const HR3 = 11; // Row header level 3 (sesi I, II, ...)

      const hdrFont = { bold: true, size: 9 };
      const hdrAlign: any = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // NOMOR (span URUT + PESERTA, row 1-2)
      sheet.mergeCells(HR1, 1, HR2, 1);
      sheet.getCell(HR1, 1).value = 'URUT';
      sheet.mergeCells(HR1, 2, HR2, 2);
      sheet.getCell(HR1, 2).value = 'NOMOR\nPESERTA';
      sheet.mergeCells(HR1, 3, HR2, 3);
      sheet.getCell(HR1, 3).value = 'NAMA PESERTA';
      sheet.mergeCells(HR1, 4, HR2, 4);
      sheet.getCell(HR1, 4).value = 'L/P';

      // HARI/TANGGAL header (span semua kolom sesi)
      if (totalSessionCols > 0) {
        if (totalSessionCols > 1) {
          sheet.mergeCells(HR1, fixedCols + 1, HR1, totalCols);
        }
        sheet.getCell(HR1, fixedCols + 1).value = 'HARI/TANGGAL';
      }

      // Per tanggal: header hari+tanggal + sesi I, II, ...
      let colCursor = fixedCols + 1;
      for (const { tgl, sessions } of sortedDates) {
        const d = new Date(tgl);
        const dayName = hariNames[d.getDay()];
        const dateDisplay = `${dayName}\n${d.getDate()}-${bulanNames[d.getMonth()]}-${d.getFullYear()}`;

        if (sessions.length > 1) {
          sheet.mergeCells(HR2, colCursor, HR2, colCursor + sessions.length - 1);
        }
        sheet.getCell(HR2, colCursor).value = dateDisplay;

        for (let si = 0; si < sessions.length; si++) {
          const romanSesi = ['I', 'II', 'III', 'IV', 'V', 'VI'][si] || (si + 1).toString();
          sheet.getCell(HR3, colCursor + si).value = romanSesi;
        }
        colCursor += sessions.length;
      }

      // Style seluruh header
      for (let r = HR1; r <= HR3; r++) {
        for (let c = 1; c <= totalCols; c++) {
          const cell = sheet.getCell(r, c);
          cell.font = hdrFont;
          cell.alignment = hdrAlign;
          cell.border = thinBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
        }
        sheet.getRow(r).height = r === HR2 ? 28 : 18;
      }

      // ===== DATA ROWS =====
      const dataStartRow = HR3 + 1;
      siswaList.forEach((d: any, idx: number) => {
        const siswa = d.siswa || {};
        const rowIdx = dataStartRow + idx;
        const gender = (siswa.gender || '').toLowerCase();
        const lp = gender.includes('laki') ? 'L' : gender.includes('perempuan') ? 'P' : '-';
        const nomorPeserta = makeNomor(d, idx);

        const cellUrut = sheet.getCell(rowIdx, 1);
        cellUrut.value = idx + 1;
        cellUrut.font = { size: 9 };
        cellUrut.alignment = { horizontal: 'center', vertical: 'middle' };
        cellUrut.border = thinBorder;

        const cellNomor = sheet.getCell(rowIdx, 2);
        cellNomor.value = nomorPeserta;
        cellNomor.font = { size: 8 };
        cellNomor.alignment = { horizontal: 'left', vertical: 'middle' };
        cellNomor.border = thinBorder;

        const cellNama = sheet.getCell(rowIdx, 3);
        cellNama.value = siswa.fullName || '';
        cellNama.font = { size: 9 };
        cellNama.alignment = { horizontal: 'left', vertical: 'middle' };
        cellNama.border = thinBorder;

        const cellLP = sheet.getCell(rowIdx, 4);
        cellLP.value = lp;
        cellLP.font = { size: 9 };
        cellLP.alignment = { horizontal: 'center', vertical: 'middle' };
        cellLP.border = thinBorder;

        // Sesi kolom — kosong untuk isi tangan
        for (let c = fixedCols + 1; c <= totalCols; c++) {
          sheet.getCell(rowIdx, c).border = thinBorder;
        }
        // Auto fit row height (do not explicitly set height)
      });

      // ===== COLUMN WIDTHS =====
      sheet.getColumn(1).width = 5;   // URUT
      sheet.getColumn(2).width = 18;  // NOMOR PESERTA
      sheet.getColumn(3).width = 22;  // NAMA PESERTA
      sheet.getColumn(4).width = 4;   // L/P
      for (let c = fixedCols + 1; c <= totalCols; c++) {
        sheet.getColumn(c).width = 5; // Sesi columns
      }

      // ===== RINGKASAN JUMLAH =====
      const jumlahTotal = siswaList.length;
      const jumlahL = siswaList.filter((d: any) => {
        const g = (d.siswa?.gender || '').toLowerCase();
        return g.includes('laki');
      }).length;
      const jumlahP = jumlahTotal - jumlahL;

      const summaryStartRow = dataStartRow + siswaList.length + 1;
      const summaryLabelCols = 3; // label mencakup kolom 1-3

      const addSummaryRow = (row: number, label: string, value: number) => {
        sheet.mergeCells(row, 1, row, summaryLabelCols);
        const cellLabel = sheet.getCell(row, 1);
        cellLabel.value = label;
        cellLabel.font = { bold: true, size: 9 };
        cellLabel.alignment = { horizontal: 'left', vertical: 'middle' };
        cellLabel.border = thinBorder;

        const cellVal = sheet.getCell(row, 4);
        cellVal.value = value;
        cellVal.font = { bold: true, size: 9 };
        cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellVal.border = thinBorder;
        sheet.getRow(row).height = 16;
      };

      addSummaryRow(summaryStartRow, 'JUMLAH PESERTA', jumlahTotal);
      addSummaryRow(summaryStartRow + 1, 'LAKI-LAKI (L)', jumlahL);
      addSummaryRow(summaryStartRow + 2, 'PEREMPUAN (P)', jumlahP);

      // ===== TANDA TANGAN =====
      const ttd = config.ttd || {};
      const panitiaList2 = await this.getPanitia(ujianId);
      const ketua = panitiaList2.find((p: any) => (p.jabatan || '').toLowerCase().includes('ketua'));
      const ketuaName = ketua?.pegawai?.name || ttd.nama || '';
      const ketuaNip = ketua?.pegawai?.nip || ttd.nip || '';

      const kepsekName = ttd.nama || '';
      const kepsekNip = ttd.nip || '';
      const kepsekJabatan = ttd.jabatan || 'Kepala Madrasah';

      // Format tanggal TTD
      let tglTtdStr = '';
      try {
        const tglTtd = ttd.tanggal ? new Date(ttd.tanggal) : new Date();
        const bulanIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        tglTtdStr = `${tglTtd.getDate()} ${bulanIndo[tglTtd.getMonth()]} ${tglTtd.getFullYear()}`;
      } catch(e) { tglTtdStr = ''; }

      const ttdRow = summaryStartRow + 4;
      const leftColStart = 3; // Mengetahui / Kepala Madrasah
      const leftColEnd = 12; // Lebar merge secukupnya
      const rightColStart = 19; // Ketua Panitia
      const rightColEnd = Math.max(19 + 5, totalCols); // Lebar merge secukupnya

      // Kiri: Mengetahui / Kepala Madrasah
      sheet.mergeCells(ttdRow, leftColStart, ttdRow, leftColEnd);
      sheet.getCell(ttdRow, leftColStart).value = 'Mengetahui :';
      sheet.getCell(ttdRow, leftColStart).font = { size: 9 };
      sheet.getCell(ttdRow, leftColStart).alignment = { horizontal: 'left' };

      sheet.mergeCells(ttdRow + 1, leftColStart, ttdRow + 1, leftColEnd);
      sheet.getCell(ttdRow + 1, leftColStart).value = kepsekJabatan;
      sheet.getCell(ttdRow + 1, leftColStart).font = { size: 9 };
      sheet.getCell(ttdRow + 1, leftColStart).alignment = { horizontal: 'left' };

      // Kanan: Tempat, tanggal + Ketua Panitia
      sheet.mergeCells(ttdRow, rightColStart, ttdRow, rightColEnd);
      sheet.getCell(ttdRow, rightColStart).value = `${ttd.tempat || 'Wanasaba'}, ${tglTtdStr}`;
      sheet.getCell(ttdRow, rightColStart).font = { size: 9 };
      sheet.getCell(ttdRow, rightColStart).alignment = { horizontal: 'left' };

      sheet.mergeCells(ttdRow + 1, rightColStart, ttdRow + 1, rightColEnd);
      sheet.getCell(ttdRow + 1, rightColStart).value = 'Ketua Panitia';
      sheet.getCell(ttdRow + 1, rightColStart).font = { size: 9 };
      sheet.getCell(ttdRow + 1, rightColStart).alignment = { horizontal: 'left' };

      // Spasi tanda tangan (4 baris)
      const signRow = ttdRow + 5;

      // Nama & NIP Kepsek (kiri)
      sheet.mergeCells(signRow, leftColStart, signRow, leftColEnd);
      sheet.getCell(signRow, leftColStart).value = kepsekName;
      sheet.getCell(signRow, leftColStart).font = { bold: true, size: 9 };
      sheet.getCell(signRow, leftColStart).alignment = { horizontal: 'left' };

      sheet.mergeCells(signRow + 1, leftColStart, signRow + 1, leftColEnd);
      sheet.getCell(signRow + 1, leftColStart).value = kepsekNip ? `NIP. ${kepsekNip}` : '';
      sheet.getCell(signRow + 1, leftColStart).font = { size: 9 };
      sheet.getCell(signRow + 1, leftColStart).alignment = { horizontal: 'left' };

      // Nama & NIP Ketua Panitia (kanan)
      sheet.mergeCells(signRow, rightColStart, signRow, rightColEnd);
      sheet.getCell(signRow, rightColStart).value = ketuaName;
      sheet.getCell(signRow, rightColStart).font = { bold: true, size: 9 };
      sheet.getCell(signRow, rightColStart).alignment = { horizontal: 'left' };

      sheet.mergeCells(signRow + 1, rightColStart, signRow + 1, rightColEnd);
      sheet.getCell(signRow + 1, rightColStart).value = ketuaNip ? `NIP. ${ketuaNip}` : '';
      sheet.getCell(signRow + 1, rightColStart).font = { size: 9 };
      sheet.getCell(signRow + 1, rightColStart).alignment = { horizontal: 'left' };
    }

    if (workbook.worksheets.length === 0) {
      throw new Error('Tidak ada data kelas untuk di-export');
    }

    return await workbook.xlsx.writeBuffer();
  }

}
