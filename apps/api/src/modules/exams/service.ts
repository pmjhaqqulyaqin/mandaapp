import { db } from '../../db';
import {
  ujian, panitiaUjian, jadwalUjian, ruangUjian,
  penugasanPengawas, distribusiPeserta, employees,
  studentProfiles, classes, majors
} from '../../db/schema';
import { eq, desc, asc, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';

export class ExamService {

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
    return await db.update(ujian).set({
      namaUjian: data.namaUjian,
      jenis: data.jenis,
      tahunAjaran: data.tahunAjaran,
      semester: data.semester,
      tanggalMulai: data.tanggalMulai,
      tanggalSelesai: data.tanggalSelesai,
      ketuaPanitiaId: data.ketuaPanitiaId || null,
      status: data.status,
      pengaturan: data.pengaturan,
      updatedAt: new Date()
    }).where(eq(ujian.id, id)).returning();
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
      name: classes.name,
      majorCode: majors.code,
      majorName: majors.name
    };

    if (peng.kelasPeserta && peng.kelasPeserta.length > 0) {
      classList = await db.select(selectFields)
        .from(classes)
        .leftJoin(majors, eq(classes.majorId, majors.id))
        .where(inArray(classes.id, peng.kelasPeserta))
        .orderBy(asc(classes.name));
    } else {
      classList = await db.select(selectFields)
        .from(classes)
        .leftJoin(majors, eq(classes.majorId, majors.id))
        .orderBy(asc(classes.name));
    }

    const cols = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Hari/Tanggal', key: 'hariTanggal', width: 25 },
      { header: 'Waktu', key: 'waktu', width: 20 },
    ];
    classList.forEach((c: any) => {
      const major = c.majorName || c.majorCode;
      const display = major ? (/^\d+$/.test(major) ? `${c.name}-${major}` : `${c.name} ${major}`) : c.name;
      cols.push({ header: display, key: display, width: 20 });
    });
    sheet.columns = cols;
    sheet.getRow(1).font = { bold: true };

    const w = peng.waktuSesi || {
      normal: [{ mulai: '07:30', selesai: '09:30' }, { mulai: '10:00', selesai: '12:00' }],
      jumat: [{ mulai: '07:15', selesai: '09:15' }, { mulai: '09:30', selesai: '11:30' }]
    };

    const start = new Date(ujianData.tanggalMulai);
    const end = new Date(ujianData.tanggalSelesai);
    let no = 1;

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // Skip Sunday

      const isJumat = d.getDay() === 5;
      const sesi = isJumat ? w.jumat : w.normal;
      const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const dateStr = `${hariNames[d.getDay()]}, ${d.toLocaleDateString('id-ID')}`;

      const row1: any = { no: no++, hariTanggal: dateStr, waktu: `${sesi[0]?.mulai||''} - ${sesi[0]?.selesai||''}` };
      sheet.addRow(row1);
      const row2: any = { no: no++, hariTanggal: '', waktu: `${sesi[1]?.mulai||''} - ${sesi[1]?.selesai||''}` };
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
      name: classes.name,
      majorCode: majors.code,
      majorName: majors.name
    };

    if (peng.kelasPeserta && peng.kelasPeserta.length > 0) {
      classList = await db.select(selectFields)
        .from(classes)
        .leftJoin(majors, eq(classes.majorId, majors.id))
        .where(inArray(classes.id, peng.kelasPeserta))
        .orderBy(asc(classes.name));
    } else {
      classList = await db.select(selectFields)
        .from(classes)
        .leftJoin(majors, eq(classes.majorId, majors.id))
        .orderBy(asc(classes.name));
    }
    const classNames = classList.map((c: any) => {
      const major = c.majorName || c.majorCode;
      return major ? (/^\d+$/.test(major) ? `${c.name}-${major}` : `${c.name} ${major}`) : c.name;
    });
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
    for(let c = 1; c <= totalCols; c++) {
      sheet.getCell(4, c).border = headerBorderObj;
    }

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

    if(classNames.length > 0) {
      sheet.mergeCells(8, 4, 8, totalCols);
      sheet.getCell(8, 4).value = 'Kelas / Jurusan';
      sheet.getCell(8, 4).alignment = { horizontal: 'center' };
      classNames.forEach((n, idx) => {
         sheet.getCell(9, 4 + idx).value = n;
      });
    }

    for(let r=8; r<=9; r++) {
        for(let c=1; c<=totalCols; c++) {
            const cell = sheet.getCell(r, c);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { bold: true, size: 10 };
        }
    }

    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dateMap = new Map();
    jadwal.forEach((r: any) => {
       if(!dateMap.has(r.tanggal)) {
         const d = new Date(r.tanggal);
         dateMap.set(r.tanggal, { dateStr: `${hariNames[d.getDay()]}, ${d.toLocaleDateString('id-ID')}`, tDate: d.getTime(), sessions: new Map() });
       }
       const dObj = dateMap.get(r.tanggal);
       const tKey = `${r.waktuMulai} - ${r.waktuSelesai}`;

       if(!dObj.sessions.has(tKey)) dObj.sessions.set(tKey, {});
       const sObj = dObj.sessions.get(tKey);
       
       const classesInRow = (r.kelas || '').split(',').map((c:string) => c.trim());
       classesInRow.forEach((c:string) => {
         if(c && c !== '') sObj[c] = r.mataPelajaran;
       });
    });

    const dateArray = Array.from(dateMap.values()).sort((a,b) => a.tDate - b.tDate);
    
    let currentRowNum = 10;
    let no = 1;

    dateArray.forEach(dObj => {
       const sessions = Array.from(dObj.sessions.entries()).sort((a:any, b:any) => a[0].localeCompare(b[0]));
       
       sessions.forEach((sess:any, idx: number) => {
          const rowData = [];
          if(idx === 0) {
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
          for(let c=1; c<=totalCols; c++) {
              const cell = sheet.getCell(currentRowNum, c);
              cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
              cell.font = { size: 10 };
          }
          currentRowNum++;
       });
       
       if(sessions.length > 1) {
          const startR = currentRowNum - sessions.length;
          const endR = currentRowNum - 1;
          sheet.mergeCells(startR, 1, endR, 1); // No
          sheet.mergeCells(startR, 2, endR, 2); // Hari/Tgl
       }
    });

    sheet.addRow([]); sheet.addRow([]);
    const ttdR = currentRowNum + 2;
    const ttdColStr = Math.max(1, totalCols - 2);

    const dStr = ttd.tanggal ? new Date(ttd.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'}) : '';
    sheet.getCell(ttdR, ttdColStr).value = `${ttd.tempat || 'Tempat'}, ${dStr}`;
    sheet.getCell(ttdR+1, ttdColStr).value = ttd.jabatan || 'Kepala Madrasah';
    
    sheet.getCell(ttdR+5, ttdColStr).value = ttd.nama || '';
    sheet.getCell(ttdR+5, ttdColStr).font = { bold: true };
    sheet.getCell(ttdR+6, ttdColStr).value = `NIP. ${ttd.nip || ''}`;

    // Columns width
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 18;
    for(let c=4; c<=totalCols; c++) sheet.getColumn(c).width = 18;

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

  static async generatePengawas(ujianId: string) {
    // Get all jadwal and ruang for this ujian
    const jadwalList = await this.getJadwal(ujianId);
    const ruangList = await this.getRuang(ujianId);
    
    // Get available employees (teachers)
    const teacherList = await db.select()
      .from(employees)
      .where(eq(employees.status, 'active'))
      .orderBy(asc(employees.name));

    if (jadwalList.length === 0) throw new Error('Belum ada jadwal ujian');
    if (ruangList.length === 0) throw new Error('Belum ada ruang ujian');
    if (teacherList.length === 0) throw new Error('Tidak ada pegawai aktif');

    // Clear existing penugasan for this ujian
    const jadwalIds = jadwalList.map((j: any) => j.id);
    if (jadwalIds.length > 0) {
      await db.delete(penugasanPengawas).where(inArray(penugasanPengawas.jadwalId, jadwalIds));
    }

    // Round-robin assignment
    const assignments: any[] = [];
    let teacherIdx = 0;

    for (const jadwal of jadwalList) {
      for (const ruang of ruangList) {
        assignments.push({
          id: uuidv4(),
          jadwalId: (jadwal as any).id,
          ruangId: (ruang as any).id,
          pengawasId: teacherList[teacherIdx % teacherList.length].id
        });
        teacherIdx++;
      }
    }

    if (assignments.length > 0) {
      await db.insert(penugasanPengawas).values(assignments);
    }

    return { generated: assignments.length };
  }

  static async exportPengawasExcel(ujianId: string) {
    const pengawasData = await this.getPengawas(ujianId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Penugasan Pengawas');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Waktu', key: 'waktu', width: 18 },
      { header: 'Mata Pelajaran', key: 'mapel', width: 25 },
      { header: 'Ruang', key: 'ruang', width: 15 },
      { header: 'Pengawas', key: 'pengawas', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };

    pengawasData.forEach((row: any, i: number) => {
      sheet.addRow({
        no: i + 1,
        tanggal: row.jadwal?.tanggal ? new Date(row.jadwal.tanggal).toLocaleDateString('id-ID') : '-',
        waktu: `${row.jadwal?.waktuMulai || ''} - ${row.jadwal?.waktuSelesai || ''}`,
        mapel: row.jadwal?.mataPelajaran || '-',
        ruang: row.ruang?.namaRuang || '-',
        pengawas: row.pengawas?.name || '-',
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  // ============ DISTRIBUSI PESERTA ============

  static async getDistribusi(ujianId: string) {
    const list = await db.select()
      .from(distribusiPeserta)
      .leftJoin(ruangUjian, eq(distribusiPeserta.ruangId, ruangUjian.id))
      .leftJoin(studentProfiles, eq(distribusiPeserta.siswaId, studentProfiles.id))
      .where(eq(distribusiPeserta.ujianId, ujianId))
      .orderBy(asc(ruangUjian.namaRuang), asc(distribusiPeserta.nomorMeja));

    return list.map(item => ({
      ...item.distribusi_peserta,
      ruang: item.ruang_ujian,
      siswa: item.student_profiles
    }));
  }

  static async generateDistribusi(ujianId: string, mode: 'kelas' | 'acak' | 'urut', kelasIds?: string[]) {
    // Get ruang
    const ruangList = await this.getRuang(ujianId);
    if (ruangList.length === 0) throw new Error('Belum ada ruang ujian');

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

    // Clear existing distribusi
    await db.delete(distribusiPeserta).where(eq(distribusiPeserta.ujianId, ujianId));

    // Sort based on mode
    let sortedStudents = [...studentList];
    if (mode === 'acak') {
      // Shuffle
      for (let i = sortedStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedStudents[i], sortedStudents[j]] = [sortedStudents[j], sortedStudents[i]];
      }
    } else if (mode === 'urut') {
      sortedStudents.sort((a, b) => (a.nis || '').localeCompare(b.nis || ''));
    }
    // 'kelas' mode keeps the original order (grouped by classId, then name)

    // Distribute students to rooms
    const assignments: any[] = [];
    let ruangIdx = 0;
    let mejaCounter: Record<string, number> = {};

    for (const student of sortedStudents) {
      // Find a room with capacity
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
          
          // Move to next room when full
          if (currentCount + 1 >= currentRuang.kapasitas) {
            ruangIdx++;
          }
          break;
        }
        ruangIdx++;
      }

      if (!placed) {
        // All rooms full, still assign to last room
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

  static async exportDistribusiExcel(ujianId: string) {
    const distribusi = await this.getDistribusi(ujianId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Distribusi Peserta');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Ruang', key: 'ruang', width: 15 },
      { header: 'No. Meja', key: 'meja', width: 10 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'NISN', key: 'nisn', width: 15 },
      { header: 'Nama Peserta', key: 'nama', width: 35 },
      { header: 'Kelas', key: 'kelas', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    distribusi.forEach((row: any, i: number) => {
      sheet.addRow({
        no: i + 1,
        ruang: row.ruang?.namaRuang || '-',
        meja: row.nomorMeja || '-',
        nis: row.siswa?.nis || '-',
        nisn: row.siswa?.nisn || '-',
        nama: row.siswa?.fullName || '-',
        kelas: row.siswa?.className || '-'
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  static async exportDaftarHadirExcel(ujianId: string, ruangId?: string) {
    const distribusi = await this.getDistribusi(ujianId);
    const filtered = ruangId ? distribusi.filter((d: any) => d.ruangId === ruangId) : distribusi;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daftar Hadir');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Peserta', key: 'nama', width: 35 },
      { header: 'Ruang', key: 'ruang', width: 12 },
      { header: 'TTD', key: 'ttd', width: 15 },
      { header: 'Keterangan', key: 'ket', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    filtered.forEach((row: any, i: number) => {
      sheet.addRow({
        no: i + 1,
        nis: row.siswa?.nis || row.siswa?.nisn || '-',
        nama: row.siswa?.fullName || '-',
        ruang: row.ruang?.namaRuang || '-',
        ttd: '',
        ket: ''
      });
    });

    return await workbook.xlsx.writeBuffer();
  }
}
