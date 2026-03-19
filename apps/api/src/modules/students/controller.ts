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
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('DataSiswa');

      worksheet.columns = [
        { header: 'NamaSiswa', key: 'fullName', width: 25 },
        { header: 'NISN', key: 'nisn', width: 20 },
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'Kelas', key: 'className', width: 20 },
        { header: 'TempatLahir', key: 'birthPlace', width: 20 },
        { header: 'TanggalLahir', key: 'birthDate', width: 15 },
        { header: 'JenisKelamin', key: 'gender', width: 15 },
        { header: 'Alamat', key: 'address', width: 30 }
      ];

      // Fetch dynamic class names from DB
      const classes = await require('../classes/service').ClassService.getAllClasses();
      const classNames = classes.map((c: any) => c.name);

      // Create a hidden sheet to store the dropdown list values cleanly (bypassing 255char limit)
      const listSheet = workbook.addWorksheet('SystemData', { state: 'hidden' });
      classNames.forEach((name: string, idx: number) => {
        listSheet.getCell(`A${idx + 1}`).value = name;
      });

      // Apply Data Validation loops for first 500 rows
      for (let i = 2; i <= 500; i++) {
        // Gender Dropdown
        worksheet.getCell(`G${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Laki-laki,Perempuan"']
        };

        // Class Dropdown (if there are classes)
        if (classNames.length > 0) {
           worksheet.getCell(`D${i}`).dataValidation = {
             type: 'list',
             allowBlank: true,
             formulae: [`SystemData!$A$1:$A$${classNames.length}`]
           };
        }
      }

      worksheet.addRow({
        fullName: 'Budi Santoso',
        nisn: '1234567890',
        nis: '1001',
        className: classNames[0] || '',
        birthPlace: 'Jakarta',
        birthDate: '2008-01-01',
        gender: 'Laki-laki',
        address: 'Jl. Merdeka No 1'
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="template_data_siswa.xlsx"');
      
      await workbook.xlsx.write(res);
      res.end();
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
