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

  static async bulkUpdate(req: Request, res: Response) {
    try {
      const { studentIds, classId, status } = req.body;
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: "studentIds array is required" });
      }
      
      const updateData: any = {};
      if (classId !== undefined) updateData.classId = classId;
      if (status !== undefined) updateData.status = status;

      const results = [];
      for (const id of studentIds) {
        const updated = await StudentService.updateStudent(id, updateData);
        if (updated) results.push(updated);
      }
      res.json({ message: "Bulk update successful", count: results.length, data: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to perform bulk update" });
    }
  }

  static async pullFromNIS(req: Request, res: Response) {
    try {
      const { studentIds, classId } = req.body;
      if (!studentIds?.length || !classId) {
        return res.status(400).json({ error: "studentIds dan classId wajib diisi" });
      }
      // Update each student's classId
      const results = [];
      for (const id of studentIds) {
        const updated = await StudentService.updateStudent(id, { classId });
        if (updated) results.push(updated);
      }
      res.json({ message: `${results.length} siswa berhasil di-assign ke kelas.`, count: results.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to pull from NIS" });
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
      const classNames = classes.map((c: any) => {
        const major = c.majorName || c.majorCode || '';
        return major ? `${c.name} - ${major}` : c.name;
      });

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

      // Fetch classes to map dropdown value back to classId
      const classesData = await require('../classes/service').ClassService.getAllClasses();

      const mappedData = data.map((row) => {
        let parsedDate: string | null = null;
        const rawDate = row['Tanggal Lahir'] || row.TanggalLahir;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
          }
        }

        const rawClassName = String(row.Kelas || row.NamaKelas || '').trim();
        const matchedClass = classesData.find((c: any) => {
          const major = c.majorName || c.majorCode || '';
          const dropdownValue = major ? `${c.name} - ${major}` : c.name;
          return dropdownValue === rawClassName || c.name === rawClassName;
        });

        return {
          fullName: row.Nama || row.NamaSiswa || row.Name,
          nisn: String(row.NISN || ''),
          nis: String(row.NIS || ''),
          classId: matchedClass ? matchedClass.id : null,
          className: matchedClass ? matchedClass.name : rawClassName.substring(0, 50),
          birthPlace: row['Tempat Lahir'] || row.TempatLahir,
          birthDate: parsedDate,
          gender: row['Jenis Kelamin'] || row.JenisKelamin || row.Gender,
          address: row.Alamat || row.Address
        };
      }).filter((r) => r.nisn && r.nisn.trim() !== ''); // Only insert valid rows with NISN

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

  static async delete(req: Request, res: Response) {
    try {
      const deleted = await StudentService.deleteStudent(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Not found" });
      res.json({ message: "Student deleted successfully", data: deleted });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
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

  static async publicSearch(req: Request, res: Response) {
    try {
      const { fullName, birthPlace, birthDate } = req.body;
      if (!fullName || !birthPlace || !birthDate) {
        return res.status(400).json({ error: "Kolom Nama Lengkap, Tempat Lahir, dan Tanggal Lahir harus diisi." });
      }

      const student = await StudentService.publicSearchStudent(fullName, birthPlace, birthDate);
      if (!student) {
        // DEBUG: If not found, search by name only to see what's wrong
        const { db } = require('../../db');
        const { studentProfiles } = require('../../db/schema');
        const { ilike } = require('drizzle-orm');
        
        const partialMatches = await db.select().from(studentProfiles)
          .where(ilike(studentProfiles.fullName, `%${fullName.trim()}%`))
          .limit(1);
          
        if (partialMatches.length > 0) {
          const m = partialMatches[0];
          return res.status(404).json({ 
            error: `DEBUG - Ditemukan dlm DB dgn nama mirip, tapi beda data lain. DB: Tmp:[${m.birthPlace}], Tgl:[${m.birthDate}]. Input: Tmp:[${birthPlace}], Tgl:[${birthDate}]` 
          });
        }
      
        return res.status(404).json({ error: "Data siswa tidak ditemukan sama sekali." });
      }

      // Return only safe necessary data for card printing
      res.json({
        id: student.id,
        fullName: student.fullName,
        nisn: student.nisn,
        nis: student.nis,
        className: student.className,
        birthPlace: student.birthPlace,
        birthDate: student.birthDate,
        gender: student.gender,
        address: student.address,
        photoUrl: student.photoUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "Terjadi kesalahan pada server saat mencari data." });
    }
  }

  static async autocompleteSearch(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length < 2) {
        return res.json([]);
      }
      const results = await StudentService.searchStudentsAutocomplete(q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to search students" });
    }
  }
}
