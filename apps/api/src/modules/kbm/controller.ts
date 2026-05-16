import { Request, Response } from "express";
import { KbmService } from "./service";
import * as xlsx from "xlsx";

export class KbmController {

  // ═══ Subjects ═══════════════════════════════════════════════

  static async getSubjects(req: Request, res: Response) {
    try {
      const active = req.query.active === 'true';
      const results = await KbmService.getSubjects(active);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createSubject(req: Request, res: Response) {
    try {
      const { kode, nama } = req.body;
      if (!kode || !nama) return res.status(400).json({ error: "kode dan nama diperlukan" });
      const result = await KbmService.createSubject({ kode, nama });
      res.status(201).json(result);
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        return res.status(409).json({ error: `Kode mapel "${req.body.kode}" sudah digunakan` });
      }
      res.status(500).json({ error: err.message });
    }
  }

  static async updateSubject(req: Request, res: Response) {
    try {
      const result = await KbmService.updateSubject(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Mapel tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteSubject(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteSubject(req.params.id);
      if (!result) return res.status(404).json({ error: "Mapel tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async seedSubjects(_req: Request, res: Response) {
    try {
      const result = await KbmService.seedDefaultSubjects();
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Distribusi Jam ═════════════════════════════════════════

  static async getDistribusi(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const results = await KbmService.getDistribusi(academicYearId as string, semester as string);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async upsertDistribusi(req: Request, res: Response) {
    try {
      const { academicYearId, semester, guruId, kelasId, subjectId, jumlahJam } = req.body;
      if (!academicYearId || !semester || !guruId || !kelasId || !subjectId) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await KbmService.upsertDistribusi({
        academicYearId, semester, guruId, kelasId, subjectId,
        jumlahJam: Number(jumlahJam) || 0,
      });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async bulkUpsertDistribusi(req: Request, res: Response) {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) return res.status(400).json({ error: "records array diperlukan" });
      const results = await KbmService.bulkUpsertDistribusi(records);
      res.json({ success: true, count: results.length, results });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteDistribusi(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteDistribusi(req.params.id);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async getJtmSummary(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const results = await KbmService.getJtmSummary(academicYearId as string, semester as string);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async downloadTemplate(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const data = await KbmService.getTemplateData(academicYearId as string, semester as string);
      const wb = xlsx.utils.book_new();

      // Header row
      const classNames = data.classList.map(c => c.name).sort();
      const header = ['NIP', 'Nama Guru', 'Kode Mapel', 'Nama Mapel', ...classNames];
      const rows: any[][] = [header];

      // Pre-fill rows with existing guru+mapel combos (with current values)
      for (const row of data.rows) {
        const r: any[] = [row.guruNip, row.guruName, row.subjectKode, row.subjectNama];
        for (const cn of classNames) {
          r.push(row.cells[cn] || '');
        }
        rows.push(r);
      }

      // Add some empty rows for new entries
      for (let i = 0; i < 10; i++) {
        rows.push(['', '', '', '', ...classNames.map(() => '')]);
      }

      const ws = xlsx.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 25 },
        ...classNames.map(() => ({ wch: 6 })),
      ];
      xlsx.utils.book_append_sheet(wb, ws, 'Template Distribusi');

      // Add reference sheets
      // Guru list
      const guruRows: any[][] = [['NIP', 'Nama Guru']];
      data.guruList.forEach(g => guruRows.push([g.nip, g.name]));
      const wsGuru = xlsx.utils.aoa_to_sheet(guruRows);
      wsGuru['!cols'] = [{ wch: 20 }, { wch: 30 }];
      xlsx.utils.book_append_sheet(wb, wsGuru, 'Ref Guru');

      // Mapel list
      const mapelRows: any[][] = [['Kode', 'Nama Mapel']];
      data.subjectList.forEach(s => mapelRows.push([s.kode, s.nama]));
      const wsMapel = xlsx.utils.aoa_to_sheet(mapelRows);
      wsMapel['!cols'] = [{ wch: 10 }, { wch: 30 }];
      xlsx.utils.book_append_sheet(wb, wsMapel, 'Ref Mapel');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=template_distribusi_jam.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async importDistribusi(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.body;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "File Excel diperlukan" });
      }

      const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });

      if (rawRows.length < 2) {
        return res.status(400).json({ error: "File kosong atau format tidak valid" });
      }

      const headerRow = rawRows[0] as string[];
      // Find class columns (after 'Nama Mapel' column, index 4+)
      const classColumns = headerRow.slice(4);

      // Load lookup data
      const lookups = await KbmService.getImportLookups();
      const nipMap = new Map(lookups.guruList.map(g => [String(g.nip || '').trim(), g.id]));
      const nameMap = new Map(lookups.guruList.map(g => [g.name.toLowerCase().trim(), g.id]));
      const kodeMap = new Map(lookups.subjectList.map(s => [s.kode.toLowerCase().trim(), s.id]));
      const classMap = new Map(lookups.classList.map(c => [c.name.toLowerCase().trim(), c.id]));

      const records: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length < 3) continue;

        const nip = String(row[0] || '').trim();
        const nama = String(row[1] || '').trim();
        const kodeMapel = String(row[2] || '').trim();

        if (!nip && !nama) continue; // Skip empty rows
        if (!kodeMapel) { errors.push(`Baris ${i + 1}: Kode mapel kosong`); continue; }

        // Match guru
        let guruId = nipMap.get(nip) || nameMap.get(nama.toLowerCase());
        if (!guruId) { errors.push(`Baris ${i + 1}: Guru "${nama}" (NIP: ${nip}) tidak ditemukan`); continue; }

        // Match mapel
        let subjectId = kodeMap.get(kodeMapel.toLowerCase());
        if (!subjectId) { errors.push(`Baris ${i + 1}: Mapel kode "${kodeMapel}" tidak ditemukan`); continue; }

        // Parse class columns
        for (let j = 0; j < classColumns.length; j++) {
          const className = String(classColumns[j] || '').trim();
          const kelasId = classMap.get(className.toLowerCase());
          if (!kelasId) continue;

          const jam = parseInt(String(row[4 + j] || '0')) || 0;
          if (jam > 0) {
            records.push({ academicYearId, semester, guruId, kelasId, subjectId, jumlahJam: jam });
          }
        }
      }

      // Bulk upsert
      let imported = 0;
      if (records.length > 0) {
        const results = await KbmService.bulkUpsertDistribusi(records);
        imported = results.filter(r => r.action !== 'skipped').length;
      }

      res.json({
        success: true,
        imported,
        total: records.length,
        errors: errors.length > 0 ? errors.slice(0, 20) : [],
        message: `${imported} data berhasil diimport${errors.length > 0 ? `, ${errors.length} error` : ''}`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async copyDistribusi(req: Request, res: Response) {
    try {
      const { sourceAYId, sourceSem, targetAYId, targetSem } = req.body;
      if (!sourceAYId || !sourceSem || !targetAYId || !targetSem) {
        return res.status(400).json({ error: "Data source dan target diperlukan" });
      }
      const result = await KbmService.copySemester(sourceAYId, sourceSem, targetAYId, targetSem);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async exportDistribusi(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const data = await KbmService.getExportDistribusiData(academicYearId as string, semester as string);

      const wb = xlsx.utils.book_new();

      // Build grid: rows = guru+mapel, columns = kelas
      const classNames = data.classList.map(c => c.name).sort();
      const header = ['No', 'Nama Guru', 'NIP', 'Golongan', 'Mata Pelajaran', ...classNames, 'JML'];

      // Group distribusi by guru+mapel
      const guruMapelMap = new Map<string, { guruName: string; guruNip: string; guruGrade: string; subjectNama: string; cells: Map<string, number> }>();
      for (const d of data.distribusi) {
        const key = `${d.guruId}::${d.subjectId}`;
        if (!guruMapelMap.has(key)) {
          guruMapelMap.set(key, {
            guruName: d.guruName || '',
            guruNip: d.guruNip || '',
            guruGrade: d.guruGrade || '',
            subjectNama: d.subjectNama || '',
            cells: new Map(),
          });
        }
        guruMapelMap.get(key)!.cells.set(d.kelasName || '', d.jumlahJam);
      }

      const rows: any[][] = [header];
      let no = 1;
      const totalPerKelas: Record<string, number> = {};
      classNames.forEach(cn => totalPerKelas[cn] = 0);

      for (const [, entry] of guruMapelMap) {
        const row: any[] = [no++, entry.guruName, entry.guruNip, entry.guruGrade, entry.subjectNama];
        let rowTotal = 0;
        for (const cn of classNames) {
          const jam = entry.cells.get(cn) || 0;
          row.push(jam || '');
          rowTotal += jam;
          totalPerKelas[cn] += jam;
        }
        row.push(rowTotal);
        rows.push(row);
      }

      // Footer: total per kelas
      const footerRow: any[] = ['', 'JUMLAH JAM PELAJARAN', '', '', ''];
      let grandTotal = 0;
      for (const cn of classNames) {
        footerRow.push(totalPerKelas[cn]);
        grandTotal += totalPerKelas[cn];
      }
      footerRow.push(grandTotal);
      rows.push(footerRow);

      const ws = xlsx.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 25 }, ...classNames.map(() => ({ wch: 6 })), { wch: 6 }];
      xlsx.utils.book_append_sheet(wb, ws, 'Distribusi Jam');

      // JTM Summary sheet
      const jtmHeader = ['No', 'Nama Guru', 'NIP', 'Golongan', 'Jam Mengajar', 'Setara Tugas', 'Total JTM', 'Status'];
      const jtmRows: any[][] = [jtmHeader];
      data.jtmSummary.forEach((g, i) => {
        jtmRows.push([i + 1, g.name, g.nip, g.grade, g.jamMengajar, g.setaraTugas, g.totalJtm, g.status]);
      });
      const wsJtm = xlsx.utils.aoa_to_sheet(jtmRows);
      wsJtm['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
      xlsx.utils.book_append_sheet(wb, wsJtm, 'Rekap JTM');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=distribusi_jam_mengajar.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Tugas Tambahan Master ══════════════════════════════════

  static async getTugasMaster(_req: Request, res: Response) {
    try {
      const results = await KbmService.getTugasMaster();
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createTugasMaster(req: Request, res: Response) {
    try {
      const { namaTugas, kategori, defaultSetaraJam } = req.body;
      if (!namaTugas || !kategori) return res.status(400).json({ error: "namaTugas dan kategori diperlukan" });
      const result = await KbmService.createTugasMaster({
        namaTugas, kategori, defaultSetaraJam: Number(defaultSetaraJam) || 0,
      });
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateTugasMaster(req: Request, res: Response) {
    try {
      const result = await KbmService.updateTugasMaster(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteTugasMaster(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteTugasMaster(req.params.id);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async seedTugasMaster(_req: Request, res: Response) {
    try {
      const result = await KbmService.seedDefaultTugasMaster();
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Tugas Tambahan (Assignment) ════════════════════════════

  static async getTugas(req: Request, res: Response) {
    try {
      const { academicYearId, semester, guruId } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const results = await KbmService.getTugas(
        academicYearId as string, semester as string, guruId as string | undefined,
      );
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createTugas(req: Request, res: Response) {
    try {
      const { academicYearId, semester, guruId, masterId, keterangan, setaraJam } = req.body;
      if (!academicYearId || !semester || !guruId || !masterId) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await KbmService.createTugas({
        academicYearId, semester, guruId, masterId,
        keterangan: keterangan || null,
        setaraJam: Number(setaraJam) || 0,
      });
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateTugas(req: Request, res: Response) {
    try {
      const result = await KbmService.updateTugas(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteTugas(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteTugas(req.params.id);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async exportTugas(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const data = await KbmService.getExportTugasData(academicYearId as string, semester as string);

      const wb = xlsx.utils.book_new();
      const categories = ['struktural', 'kurikulum', 'kesiswaan'];
      const categoryLabels: Record<string, string> = {
        struktural: 'A. TUGAS TAMBAHAN UMUM',
        kurikulum: 'B. KOORDINASI KURIKULUM',
        kesiswaan: 'C. KOORDINASI KESISWAAN',
      };

      const rows: any[][] = [['DAFTAR TUGAS TAMBAHAN'], ['']];
      let grandTotal = 0;

      for (const cat of categories) {
        const items = data.tugas.filter(t => t.kategori === cat);
        rows.push([categoryLabels[cat]]);
        rows.push(['No', 'Nama', 'NIP', 'Tugas', 'Keterangan', 'Setara JTM']);
        items.forEach((t, i) => {
          rows.push([i + 1, t.guruName, t.guruNip, t.namaTugas, t.keterangan || '', t.setaraJam]);
          grandTotal += Number(t.setaraJam) || 0;
        });
        rows.push(['']);
      }

      rows.push(['', '', '', '', 'Total Setara Jam:', grandTotal]);

      const ws = xlsx.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 10 }];
      xlsx.utils.book_append_sheet(wb, ws, 'Tugas Tambahan');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=tugas_tambahan.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async downloadTugasTemplate(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const data = await KbmService.getTemplateTugasData(academicYearId as string, semester as string);
      const wb = xlsx.utils.book_new();

      // Template sheet: NIP | Nama Guru | Nama Tugas | Keterangan | Setara Jam
      const header = ['NIP', 'Nama Guru', 'Nama Tugas', 'Keterangan', 'Setara Jam'];
      const rows: any[][] = [header];

      // Pre-fill with existing assignments
      for (const t of data.tugas) {
        rows.push([t.guruNip || '', t.guruName || '', t.namaTugas || '', t.keterangan || '', t.setaraJam]);
      }

      // Add empty rows
      for (let i = 0; i < 15; i++) {
        rows.push(['', '', '', '', '']);
      }

      const ws = xlsx.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 10 }];
      xlsx.utils.book_append_sheet(wb, ws, 'Template Tugas');

      // Ref Guru
      const guruRows: any[][] = [['NIP', 'Nama Guru']];
      data.guruList.forEach(g => guruRows.push([g.nip, g.name]));
      const wsGuru = xlsx.utils.aoa_to_sheet(guruRows);
      wsGuru['!cols'] = [{ wch: 20 }, { wch: 30 }];
      xlsx.utils.book_append_sheet(wb, wsGuru, 'Ref Guru');

      // Ref Tugas Master
      const tugasRows: any[][] = [['Nama Tugas', 'Kategori', 'Default Jam']];
      data.masterList.forEach(m => tugasRows.push([m.namaTugas, m.kategori, m.defaultSetaraJam]));
      const wsTugas = xlsx.utils.aoa_to_sheet(tugasRows);
      wsTugas['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }];
      xlsx.utils.book_append_sheet(wb, wsTugas, 'Ref Tugas');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=template_tugas_tambahan.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async importTugas(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.body;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "File Excel diperlukan" });
      }

      const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });

      if (rawRows.length < 2) {
        return res.status(400).json({ error: "File kosong atau format tidak valid" });
      }

      const lookups = await KbmService.getImportTugasLookups();
      const nipMap = new Map(lookups.guruList.map(g => [String(g.nip || '').trim(), g.id]));
      const nameMap = new Map(lookups.guruList.map(g => [g.name.toLowerCase().trim(), g.id]));
      const tugasMap = new Map(lookups.masterList.map(m => [m.namaTugas.toLowerCase().trim(), m]));

      const errors: string[] = [];
      let imported = 0;

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length < 3) continue;

        const nip = String(row[0] || '').trim();
        const nama = String(row[1] || '').trim();
        const namaTugas = String(row[2] || '').trim();
        const keterangan = String(row[3] || '').trim();
        const setaraJam = parseInt(String(row[4] || '0')) || 0;

        if (!nip && !nama) continue;
        if (!namaTugas) { errors.push(`Baris ${i + 1}: Nama tugas kosong`); continue; }

        const guruId = nipMap.get(nip) || nameMap.get(nama.toLowerCase());
        if (!guruId) { errors.push(`Baris ${i + 1}: Guru "${nama}" (NIP: ${nip}) tidak ditemukan`); continue; }

        const master = tugasMap.get(namaTugas.toLowerCase());
        if (!master) { errors.push(`Baris ${i + 1}: Tugas "${namaTugas}" tidak ada di master`); continue; }

        try {
          await KbmService.createTugas({
            academicYearId, semester, guruId,
            masterId: master.id,
            keterangan: keterangan || undefined,
            setaraJam: setaraJam || master.defaultSetaraJam || 0,
          });
          imported++;
        } catch (err: any) {
          errors.push(`Baris ${i + 1}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        imported,
        errors: errors.length > 0 ? errors.slice(0, 20) : [],
        message: `${imported} tugas berhasil diimport${errors.length > 0 ? `, ${errors.length} error` : ''}`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Ruangan ════════════════════════════════════════════════

  static async getRuangan(_req: Request, res: Response) {
    try {
      const results = await KbmService.getRuangan();
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createRuangan(req: Request, res: Response) {
    try {
      const { nama, tipe, kapasitas } = req.body;
      if (!nama) return res.status(400).json({ error: "Nama ruangan diperlukan" });
      const result = await KbmService.createRuangan({ nama, tipe, kapasitas: Number(kapasitas) || 40 });
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateRuangan(req: Request, res: Response) {
    try {
      const result = await KbmService.updateRuangan(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteRuangan(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteRuangan(req.params.id);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async seedRuangan(_req: Request, res: Response) {
    try {
      const result = await KbmService.seedRuanganFromClasses();
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Dashboard ══════════════════════════════════════════════

  static async getDashboard(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) {
        return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      }
      const stats = await KbmService.getDashboardStats(academicYearId as string, semester as string);
      res.json(stats);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }
}
