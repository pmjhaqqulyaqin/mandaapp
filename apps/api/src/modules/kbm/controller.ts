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

      // Delete existing distribusi for this semester first (full replace)
      await KbmService.deleteAllDistribusi(academicYearId, semester);

      // Bulk insert new data
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

      // Delete existing tugas for this semester first (full replace)
      await KbmService.deleteAllTugas(academicYearId, semester);

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

  // ═══ Guru Unavailability ═════════════════════════════════════

  static async getGuruUnavailability(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const results = await KbmService.getGuruUnavailability(academicYearId as string, semester as string);
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async createGuruUnavailability(req: Request, res: Response) {
    try {
      const { guruId, academicYearId, semester, dayOfWeek, reason } = req.body;
      if (!guruId || !academicYearId || !semester || dayOfWeek === undefined) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await KbmService.createGuruUnavailability({ guruId, academicYearId, semester, dayOfWeek: Number(dayOfWeek), reason });
      res.status(201).json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async deleteGuruUnavailability(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteGuruUnavailability(req.params.id);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async bulkSetGuruUnavailability(req: Request, res: Response) {
    try {
      const { academicYearId, semester, entries } = req.body;
      if (!academicYearId || !semester || !Array.isArray(entries)) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await KbmService.bulkSetGuruUnavailability(academicYearId, semester, entries);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Guru Slot Availability (Per Hari × Jam) ════════════════

  static async getGuruSlotAvailability(req: Request, res: Response) {
    try {
      const { guruId, academicYearId, semester } = req.query;
      if (!guruId || !academicYearId || !semester) return res.status(400).json({ error: "guruId, academicYearId, semester diperlukan" });
      const result = await KbmService.getGuruSlotAvailability(guruId as string, academicYearId as string, semester as string);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async bulkSetGuruSlotAvailability(req: Request, res: Response) {
    try {
      const { guruId, academicYearId, semester, slots } = req.body;
      if (!guruId || !academicYearId || !semester || !Array.isArray(slots)) {
        return res.status(400).json({ error: "Data tidak lengkap" });
      }
      const result = await KbmService.bulkSetGuruSlotAvailability(guruId, academicYearId, semester, slots);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async migrateSlotAvailability(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.body;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.migrateFromDayUnavailability(academicYearId, semester);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async setAllGuruSlotsAvailable(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.body;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.setAllGuruSlotsAvailable(academicYearId, semester);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Schedule Config ════════════════════════════════════════

  static async getScheduleConfig(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.getScheduleConfig(academicYearId as string, semester as string);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async upsertScheduleConfig(req: Request, res: Response) {
    try {
      const { academicYearId, semester, ...data } = req.body;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.upsertScheduleConfig(academicYearId, semester, data);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Jadwal (Phase 2) ═══════════════════════════════════════

  static async getJadwal(req: Request, res: Response) {
    try {
      const { academicYearId, semester, kelasId, guruId } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const results = await KbmService.getJadwal(academicYearId as string, semester as string, { kelasId: kelasId as string, guruId: guruId as string });
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async generateJadwal(req: Request, res: Response) {
    try {
      const { academicYearId, semester, clearExisting } = req.body;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.generateJadwal(academicYearId, semester, clearExisting !== false);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async generateJadwalStream(req: Request, res: Response) {
    const { academicYearId, semester } = req.query;
    if (!academicYearId || !semester) { res.status(400).json({ error: "academicYearId dan semester diperlukan" }); return; }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await KbmService.generateJadwal(
        academicYearId as string, semester as string, true,
        (progress) => sendEvent('progress', progress)
      );
      sendEvent('result', result);
      sendEvent('done', { ok: true });
    } catch (err: any) {
      sendEvent('error', { message: err.message });
    } finally {
      res.end();
    }
  }

  static async moveSlot(req: Request, res: Response) {
    try {
      const { dayOfWeek, jamKe, ruanganId } = req.body;
      if (dayOfWeek === undefined || jamKe === undefined) return res.status(400).json({ error: "dayOfWeek dan jamKe diperlukan" });
      const result = await KbmService.moveSlot(req.params.id, Number(dayOfWeek), Number(jamKe), ruanganId);
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  }

  static async checkMoveSlot(req: Request, res: Response) {
    try {
      const { slotId, targetDay, targetJam } = req.query;
      if (!slotId || targetDay === undefined || targetJam === undefined) return res.status(400).json({ error: "slotId, targetDay, targetJam diperlukan" });
      const result = await KbmService.checkMoveSlot(slotId as string, Number(targetDay), Number(targetJam));
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async swapSlots(req: Request, res: Response) {
    try {
      const { slotIdA, slotIdB } = req.body;
      if (!slotIdA || !slotIdB) return res.status(400).json({ error: "slotIdA dan slotIdB diperlukan" });
      const result = await KbmService.swapSlots(slotIdA, slotIdB);
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  }

  static async findAvailableSlots(req: Request, res: Response) {
    try {
      const { academicYearId, semester, guruId, kelasId } = req.query;
      if (!academicYearId || !semester || !guruId || !kelasId) return res.status(400).json({ error: "academicYearId, semester, guruId, kelasId diperlukan" });
      const result = await KbmService.findAvailableSlots(academicYearId as string, semester as string, guruId as string, kelasId as string);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async manualPlaceBlock(req: Request, res: Response) {
    try {
      const { academicYearId, semester, guruId, kelasId, subjectId, dayOfWeek, jamKe } = req.body;
      if (!academicYearId || !semester || !guruId || !kelasId || !subjectId || dayOfWeek === undefined || jamKe === undefined)
        return res.status(400).json({ error: "Semua field diperlukan" });
      const result = await KbmService.manualPlaceBlock(academicYearId, semester, guruId, kelasId, subjectId, Number(dayOfWeek), Number(jamKe));
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  }


  static async deleteJadwalSlot(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteJadwalSlot(req.params.id);
      if (!result) return res.status(404).json({ error: "Tidak ditemukan" });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async clearJadwal(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.body;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.clearJadwal(academicYearId, semester);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async checkConflicts(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.checkConflicts(academicYearId as string, semester as string);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async scoreJadwal(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.scoreJadwal(academicYearId as string, semester as string);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // Versioning
  static async listVersions(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.listVersions(academicYearId as string, semester as string);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async activateVersion(req: Request, res: Response) {
    try {
      const result = await KbmService.activateVersion(req.params.id);
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  }

  static async deleteVersion(req: Request, res: Response) {
    try {
      const result = await KbmService.deleteVersion(req.params.id);
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  }

  static async renameVersion(req: Request, res: Response) {
    try {
      const { nama } = req.body;
      if (!nama) return res.status(400).json({ error: "nama diperlukan" });
      const result = await KbmService.renameVersion(req.params.id, nama);
      res.json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  }

  static async syncToJurnal(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.body;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const result = await KbmService.syncToJurnal(academicYearId, semester);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async exportJadwal(req: Request, res: Response) {
    try {
      const { academicYearId, semester, groupBy } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });
      const jadwal = await KbmService.getJadwal(academicYearId as string, semester as string);

      const wb = xlsx.utils.book_new();
      const dayNames: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

      if (groupBy === 'guru') {
        // Group by guru
        const guruMap = new Map<string, any[]>();
        for (const j of jadwal) {
          const key = j.guruName || 'Unknown';
          if (!guruMap.has(key)) guruMap.set(key, []);
          guruMap.get(key)!.push(j);
        }
        for (const [guruName, items] of guruMap) {
          const rows: any[][] = [['Jadwal: ' + guruName], ['Hari', 'Jam Ke', 'Kelas', 'Mapel', 'Ruangan']];
          items.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.jamKe - b.jamKe);
          items.forEach(j => rows.push([dayNames[j.dayOfWeek], j.jamKe, j.kelasName, j.subjectNama, j.ruanganNama || '-']));
          const ws = xlsx.utils.aoa_to_sheet(rows);
          ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 15 }];
          const sheetName = guruName.substring(0, 31);
          xlsx.utils.book_append_sheet(wb, ws, sheetName);
        }
      } else {
        // Group by kelas (default)
        const kelasMap = new Map<string, any[]>();
        for (const j of jadwal) {
          const key = j.kelasName || 'Unknown';
          if (!kelasMap.has(key)) kelasMap.set(key, []);
          kelasMap.get(key)!.push(j);
        }
        for (const [kelasName, items] of kelasMap) {
          const rows: any[][] = [['Jadwal Kelas: ' + kelasName], ['Hari', 'Jam Ke', 'Mapel', 'Guru', 'Ruangan']];
          items.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.jamKe - b.jamKe);
          items.forEach(j => rows.push([dayNames[j.dayOfWeek], j.jamKe, j.subjectNama, j.guruName, j.ruanganNama || '-']));
          const ws = xlsx.utils.aoa_to_sheet(rows);
          ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 15 }];
          xlsx.utils.book_append_sheet(wb, ws, kelasName.substring(0, 31));
        }
      }

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=jadwal_pelajaran.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async exportJadwalGrid(req: Request, res: Response) {
    try {
      const { academicYearId, semester } = req.query;
      if (!academicYearId || !semester) return res.status(400).json({ error: "academicYearId dan semester diperlukan" });

      const jadwal = await KbmService.getJadwal(academicYearId as string, semester as string);
      const guruList = await KbmService.getGuruWithKode();
      const subjectsList = await KbmService.getSubjects();

      const { academicYears, jurnalTimeSlots } = await import('../../db/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('../../db');
      const [ay] = await db.select().from(academicYears).where(eq(academicYears.id, academicYearId as string));
      const tahunAjaran = ay?.tahunAjaran || '';
      const semLabel = semester === 'ganjil' ? 'GANJIL' : 'GENAP';

      // Fetch time slots for "Keterangan Waktu" - group by 3 categories
      const timeSlots = await db.select().from(jurnalTimeSlots).orderBy(jurnalTimeSlots.dayOfWeek, jurnalTimeSlots.jamKe);

      // Group: Senin(1), Selasa-Kamis+Sabtu(2), Jumat(5)
      const getSlotsForDay = (day: number) => timeSlots
        .filter(ts => ts.dayOfWeek === day)
        .sort((a, b) => a.jamKe - b.jamKe)
        .map(ts => ({ jamKe: ts.jamKe, waktu: `${ts.waktuMulai} - ${ts.waktuSelesai}` }));

      const waktuGroups: { label: string; slots: { jamKe: number; waktu: string }[] }[] = [
        { label: 'Senin', slots: getSlotsForDay(1) },
        { label: 'Selasa-Kamis, Sabtu', slots: getSlotsForDay(2).length ? getSlotsForDay(2) : getSlotsForDay(3) },
        { label: 'Jumat', slots: getSlotsForDay(5) },
      ].filter(g => g.slots.length > 0);

      // Flatten waktu groups into rows: [label-row, slot-rows...]
      const waktuRows: { type: 'label' | 'slot'; label?: string; jamKe?: number; waktu?: string }[] = [];
      for (const group of waktuGroups) {
        waktuRows.push({ type: 'label', label: group.label });
        waktuRows.push({ type: 'label', label: 'Jam Ke    Waktu' });
        for (const s of group.slots) {
          waktuRows.push({ type: 'slot', jamKe: s.jamKe, waktu: s.waktu });
        }
        waktuRows.push({ type: 'label', label: '' }); // spacer
      }

      // Get unique classes sorted
      const classMap = new Map<string, string>();
      jadwal.forEach((j: any) => { if (j.kelasId && j.kelasName) classMap.set(j.kelasId, j.kelasName); });
      const classList = Array.from(classMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ id, name }));

      // Lookups
      const guruKodeMap = new Map<string, string>();
      guruList.forEach(g => { if (g.kodeGuru) guruKodeMap.set(g.id, g.kodeGuru); });
      const subjectKodeMap = new Map<string, string>();
      subjectsList.forEach((s: any) => { subjectKodeMap.set(s.id, s.kode); });
      const jadwalMap = new Map<string, any>();
      jadwal.forEach((j: any) => jadwalMap.set(`${j.dayOfWeek}-${j.jamKe}-${j.kelasId}`, j));

      const dayNames: Record<number, string> = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' };
      const maxJamPerDay = new Map<number, number>();
      jadwal.forEach((j: any) => {
        const cur = maxJamPerDay.get(j.dayOfWeek) || 0;
        if (j.jamKe > cur) maxJamPerDay.set(j.dayOfWeek, j.jamKe);
      });

      const classCount = classList.length;
      const REF_GAP = 2;
      const GURU_REF_COL = 2 + classCount + REF_GAP;
      const MAPEL_REF_COL = GURU_REF_COL + 3;
      const WAKTU_REF_COL = MAPEL_REF_COL + 3;
      const TOTAL_COLS = WAKTU_REF_COL + 3;

      // Reference data
      const guruRefs = guruList.filter(g => g.kodeGuru).sort((a, b) => {
        const aNum = parseInt(a.kodeGuru || '999');
        const bNum = parseInt(b.kodeGuru || '999');
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.kodeGuru || '').localeCompare(b.kodeGuru || '');
      });
      const subjectRefs = subjectsList.filter((s: any) => s.isActive !== false).sort((a: any, b: any) => (a.kode || '').localeCompare(b.kode || ''));

      const makeRow = () => new Array(TOTAL_COLS).fill('');
      const rows: any[][] = [];

      // Row 0: Title
      const titleRow = makeRow();
      titleRow[0] = `JADWAL PELAJARAN SEMESTER ${semLabel}`;
      rows.push(titleRow);

      // Row 1: Subtitle
      const subRow = makeRow();
      subRow[0] = `TAHUN AJARAN  ${tahunAjaran}`;
      rows.push(subRow);

      // Row 2: empty
      rows.push(makeRow());

      // Row 3: Header
      const headerRow = makeRow();
      headerRow[0] = 'HARI';
      headerRow[1] = 'JAM';
      classList.forEach((c, i) => { headerRow[2 + i] = c.name; });
      headerRow[GURU_REF_COL] = 'Kode & Nama Guru';
      headerRow[MAPEL_REF_COL] = 'Kode & Mata Pelajaran';
      headerRow[WAKTU_REF_COL] = 'Keterangan Waktu';
      rows.push(headerRow);

      // Row 4: sub header
      const subHeaderRow = makeRow();
      rows.push(subHeaderRow);

      let refIdx = 0;
      let waktuIdx = 0;

      const writeRef = (row: any[]) => {
        if (refIdx < guruRefs.length) {
          row[GURU_REF_COL] = guruRefs[refIdx].kodeGuru;
          row[GURU_REF_COL + 1] = guruRefs[refIdx].name;
        }
        if (refIdx < subjectRefs.length) {
          row[MAPEL_REF_COL] = (subjectRefs[refIdx] as any).kode;
          row[MAPEL_REF_COL + 1] = (subjectRefs[refIdx] as any).nama;
        }
        if (waktuIdx < waktuRows.length) {
          const wr = waktuRows[waktuIdx];
          if (wr.type === 'label') {
            row[WAKTU_REF_COL] = wr.label || '';
            row[WAKTU_REF_COL + 1] = '';
          } else {
            row[WAKTU_REF_COL] = wr.jamKe;
            row[WAKTU_REF_COL + 1] = wr.waktu;
          }
          waktuIdx++;
        }
        refIdx++;
      };

      // Data rows per day
      for (const day of [1, 2, 3, 4, 5, 6]) {
        const maxJam = maxJamPerDay.get(day) || 0;
        if (maxJam === 0) continue;

        for (let jam = 1; jam <= maxJam; jam++) {
          const row = makeRow();
          row[0] = jam === 1 ? dayNames[day] : '';
          row[1] = jam;

          for (let ci = 0; ci < classList.length; ci++) {
            const entry = jadwalMap.get(`${day}-${jam}-${classList[ci].id}`);
            if (entry) {
              const gK = guruKodeMap.get(entry.guruId) || '?';
              const sK = subjectKodeMap.get(entry.subjectId) || '?';
              row[2 + ci] = `${gK}${sK}`;
            }
          }

          writeRef(row);
          rows.push(row);
        }
      }

      // Write remaining refs
      while (refIdx < guruRefs.length || refIdx < subjectRefs.length || waktuIdx < waktuRows.length) {
        const row = makeRow();
        writeRef(row);
        rows.push(row);
      }

      const ws = xlsx.utils.aoa_to_sheet(rows);

      // Column widths
      const cols: any[] = [{ wch: 10 }, { wch: 5 }];
      classList.forEach(() => cols.push({ wch: 9 }));
      for (let i = 0; i < REF_GAP; i++) cols.push({ wch: 2 });
      cols.push({ wch: 6 }, { wch: 32 }, { wch: 2 }); // guru ref
      cols.push({ wch: 5 }, { wch: 28 }, { wch: 2 }); // mapel ref
      cols.push({ wch: 7 }, { wch: 16 }); // waktu ref
      ws['!cols'] = cols;

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Jadwal Grid');

      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', `attachment; filename=jadwal_grid_${semLabel.toLowerCase()}_${tahunAjaran.replace('/', '-')}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(Buffer.from(buf));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  // ═══ Kode Guru ══════════════════════════════════════════════

  static async getGuruKode(_req: Request, res: Response) {
    try {
      const results = await KbmService.getGuruWithKode();
      res.json(results);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async updateGuruKode(req: Request, res: Response) {
    try {
      const { kodeGuru } = req.body;
      const result = await KbmService.updateGuruKode(req.params.id, kodeGuru || '');
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async bulkUpdateGuruKode(req: Request, res: Response) {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates)) return res.status(400).json({ error: "updates array diperlukan" });
      const result = await KbmService.bulkUpdateGuruKode(updates);
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  }

  static async autoAssignGuruKode(_req: Request, res: Response) {
    try {
      const result = await KbmService.autoAssignGuruKode();
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
