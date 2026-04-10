import { db } from '../../db';
import {
  ujian, panitiaUjian, jadwalUjian, ruangUjian,
  penugasanPengawas, distribusiPeserta, employees,
  studentProfiles, classes
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
      status: data.status || 'aktif'
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

  static async importJadwalFromExcel(ujianId: string, buffer: any) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('File Excel kosong');

    const rows: any[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const tanggal = row.getCell(1).text?.trim();
      const waktuMulai = row.getCell(2).text?.trim();
      const waktuSelesai = row.getCell(3).text?.trim();
      const mataPelajaran = row.getCell(4).text?.trim();
      const kelas = row.getCell(5).text?.trim();

      if (tanggal && waktuMulai && waktuSelesai && mataPelajaran) {
        rows.push({
          id: uuidv4(),
          ujianId,
          tanggal,
          waktuMulai,
          waktuSelesai,
          mataPelajaran,
          kelas: kelas || null
        });
      }
    });

    if (rows.length === 0) throw new Error('Tidak ada data valid dalam file');
    await db.insert(jadwalUjian).values(rows);
    return { imported: rows.length };
  }

  static async exportJadwalExcel(ujianId: string) {
    const jadwal = await this.getJadwal(ujianId);
    const ujianData = await this.getUjianById(ujianId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Jadwal Ujian');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Hari', key: 'hari', width: 12 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Waktu Mulai', key: 'waktuMulai', width: 12 },
      { header: 'Waktu Selesai', key: 'waktuSelesai', width: 12 },
      { header: 'Mata Pelajaran', key: 'mataPelajaran', width: 30 },
      { header: 'Kelas', key: 'kelas', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };

    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    jadwal.forEach((row: any, i: number) => {
      const d = new Date(row.tanggal);
      sheet.addRow({
        no: i + 1,
        hari: hariNames[d.getDay()] || '',
        tanggal: d.toLocaleDateString('id-ID'),
        waktuMulai: row.waktuMulai,
        waktuSelesai: row.waktuSelesai,
        mataPelajaran: row.mataPelajaran,
        kelas: row.kelas || '-'
      });
    });

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
