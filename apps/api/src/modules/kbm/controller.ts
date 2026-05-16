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
