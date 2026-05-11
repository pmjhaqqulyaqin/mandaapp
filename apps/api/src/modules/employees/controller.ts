import { Request, Response } from "express";
import { EmployeeService } from "./service";
import * as xlsx from "xlsx";

export class EmployeeController {
  static async getAll(req: Request, res: Response) {
    try {
      const typeFilter = req.query.type as string | undefined;
      const data = await EmployeeService.getAllEmployees(typeFilter ? { type: typeFilter } : undefined);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /** Resolve the logged-in user's employee record (auto-links by name if needed) */
  static async getMe(req: Request, res: Response) {
    try {
      const user = req.authUser;
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const employee = await EmployeeService.resolveEmployeeForUser(user.id, user.name, user.email);
      if (!employee) return res.json(null);
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const data = await EmployeeService.getEmployeeById(req.params.id);
      if (!data) return res.status(404).json({ error: "Pegawai not found" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      if (req.body.birthDate === '') req.body.birthDate = null;
      if (req.body.id === '') delete req.body.id;
      if (req.body.userId === '') delete req.body.userId;
      const data = await EmployeeService.createEmployee(req.body);
      res.status(201).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create pegawai" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      if (req.body.birthDate === '') req.body.birthDate = null;
      if (req.body.id === '' || req.body.id) delete req.body.id; // Never update ID column
      if (req.body.userId === '') delete req.body.userId;
      const data = await EmployeeService.updateEmployee(req.params.id, req.body);
      if (!data) return res.status(404).json({ error: "Pegawai not found" });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const data = await EmployeeService.deleteEmployee(req.params.id);
      if (!data) return res.status(404).json({ error: "Pegawai not found" });
      res.json({ message: "Pegawai deleted successfully", data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadExcel(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

      const mappedData = data.map((row) => {
        let parsedDate: string | null = null;
        const rawDate = row['Tanggal Lahir'] || row.TanggalLahir;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
          }
        }

        return {
          type: row.JenisPegawai || row.Type || 'Guru',
          name: row.Nama || row.Name,
          nip: String(row.NIP || row.NUPTK || ''),
          rank: row.Pangkat || row.Rank || '',
          grade: String(row.Golongan || row.Grade || ''),
          position: row.Jabatan || row.Position || '',
          gender: row['Jenis Kelamin'] || row.JenisKelamin || row.Gender,
          birthPlace: row['Tempat Lahir'] || row.TempatLahir,
          birthDate: parsedDate,
          task: row['Tugas Kepegawaian'] || row.TugasKepegawaian || row.Task || '',
        };
      }).filter((r) => r.nip && r.name && r.nip.trim() !== ''); // NIP and Name required and not empty

      if(mappedData.length === 0) return res.status(400).json({ error: "Data is empty or missing required fields (NIP, Nama)." });

      await EmployeeService.bulkCreateEmployees(mappedData);
      res.json({ message: `Successfully imported ${mappedData.length} records.` });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
  }

  static async downloadTemplate(req: Request, res: Response) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('DataPegawai');

      worksheet.columns = [
        { header: 'JenisPegawai', key: 'type', width: 22 },
        { header: 'Nama', key: 'name', width: 25 },
        { header: 'NIP', key: 'nip', width: 25 },
        { header: 'Pangkat', key: 'rank', width: 20 },
        { header: 'Golongan', key: 'grade', width: 15 },
        { header: 'Jabatan', key: 'position', width: 25 },
        { header: 'Jenis Kelamin', key: 'gender', width: 15 },
        { header: 'Tempat Lahir', key: 'birthPlace', width: 20 },
        { header: 'Tanggal Lahir', key: 'birthDate', width: 15 },
        { header: 'Tugas Kepegawaian', key: 'task', width: 30 },
      ];

      for (let i = 2; i <= 200; i++) {
        // Jenis Pegawai Dropdown
        worksheet.getCell(`A${i}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['"Guru,Tenaga Kependidikan"']
        };
        // Gender Dropdown
        worksheet.getCell(`G${i}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['"Laki-laki,Perempuan"']
        };
      }

      worksheet.addRow({
        type: 'Guru',
        name: 'Ahmad Basuki, M.Pd',
        nip: '198001012005011001',
        rank: 'Penata Muda Tk.I',
        grade: 'III/b',
        position: 'Guru Mapel',
        gender: 'Laki-laki',
        birthPlace: 'Semarang',
        birthDate: '1980-01-01',
        task: 'Guru Matematika X RPL'
      });
      worksheet.addRow({
        type: 'Tenaga Kependidikan',
        name: 'Siti Aminah, S.Kom',
        nip: '199002022010012002',
        rank: 'Pengatur',
        grade: 'II/c',
        position: 'Staff Tata Usaha',
        gender: 'Perempuan',
        birthPlace: 'Surabaya',
        birthDate: '1990-02-02',
        task: 'Administrasi Keuangan'
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="template_data_pegawai.xlsx"');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate template", details: error.message });
    }
  }
}
