import { Request, Response } from "express";
import { StudentService } from "./service";
import * as xlsx from "xlsx";

export class StudentController {
  static async getAll(req: Request, res: Response) {
    try {
      const classFilter = req.query.class as string;
      const students = await StudentService.getAllStudents(classFilter);
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  }

  static async downloadTemplate(req: Request, res: Response) {
    try {
      const headers = ['NamaSiswa', 'NISN', 'NIS', 'Kelas', 'TempatLahir', 'TanggalLahir', 'JenisKelamin', 'Alamat'];
      const data = [
        ['Budi Santoso', '1234567890', '1001', 'X RPL 1', 'Jakarta', '2008-01-01', 'Laki-laki', 'Jl. Merdeka No 1'],
        ['Andi Suryadi', '0987654321', '1002', 'X TKJ 2', 'Bandung', '2008-05-12', 'Laki-laki', 'Jl. Sudirman 55']
      ];
      const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
      
      // Auto-size columns conceptually
      const wscols = headers.map(h => ({ wch: Math.max(h.length, 15) }));
      worksheet['!cols'] = wscols;

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'DataSiswa');
      
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename="template_data_siswa.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate template", details: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      // Sanitize empty strings that break postgres date columns
      if (req.body.birthDate === '') req.body.birthDate = null;
      if (req.body.classId === '') req.body.classId = null;

      const student = await StudentService.createStudent(req.body);
      res.status(201).json(student);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create student" });
    }
  }

  static async uploadExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(worksheet);

      const mappedData = data.map((row) => ({
        fullName: row.Nama || row.NamaSiswa || row.Name,
        nisn: String(row.NISN || ''),
        nis: String(row.NIS || ''),
        className: row.Kelas || row.NamaKelas,
        birthPlace: row['Tempat Lahir'] || row.TempatLahir,
        birthDate: row['Tanggal Lahir'] || row.TanggalLahir ? new Date(row['Tanggal Lahir'] || row.TanggalLahir).toISOString() : null,
        gender: row['Jenis Kelamin'] || row.JenisKelamin || row.Gender,
        address: row.Alamat || row.Address
      })).filter((r) => r.nisn); // Only insert valid rows with NISN

      if (mappedData.length === 0) {
        return res.status(400).json({ error: "No valid data found in Excel. Ensure column NISN exists." });
      }

      const results = await StudentService.bulkCreateStudents(mappedData);
      res.status(201).json({ message: `Successfully imported ${results.length} students.`, data: results });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to process Excel file", details: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const student = await StudentService.getStudentById(req.params.id);
      if (!student) return res.status(404).json({ error: "Not found" });
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const updated = await StudentService.updateStudent(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update student" });
    }
  }

  static async createRevision(req: Request, res: Response) {
    try {
      const revision = await StudentService.createRevisionRequest(req.body);
      res.status(201).json(revision);
    } catch (error) {
      res.status(500).json({ error: "Failed to create revision" });
    }
  }

  static async getRevisions(req: Request, res: Response) {
    try {
      const revisions = await StudentService.getRevisions();
      res.json(revisions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revisions" });
    }
  }

  static async updateRevision(req: Request, res: Response) {
    try {
      const updated = await StudentService.updateRevisionStatus(req.params.id, req.body.status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update revision status" });
    }
  }
}
