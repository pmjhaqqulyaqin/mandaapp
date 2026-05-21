import { Request, Response } from "express";
import { StudentService } from "./service";
import * as xlsx from "xlsx";
import puppeteer from "puppeteer";
import { generateBukuIndukTemplate } from "./template";
import { AuditLogger } from "../../utils/auditLogger";

export class StudentController {
  static async getAll(req: Request, res: Response) {
    try {
      const classFilter = req.query.class as string;
      const classIdFilter = req.query.classId as string;
      const statusFilter = req.query.status as string;
      const students = await StudentService.getAllStudents(classFilter, classIdFilter, statusFilter);
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
      // Update each student's classId and status
      const results = [];
      for (const id of studentIds) {
        const updated = await StudentService.updateStudent(id, { classId, status: 'active' });
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
      let student;
      if (req.query.complete === 'true') {
        student = await StudentService.getStudentCompleteData(req.params.id);
      } else {
        student = await StudentService.getStudentById(req.params.id);
      }
      if (!student) return res.status(404).json({ error: "Not found" });
      
      await AuditLogger.log(req, "VIEW_STUDENT", "student", req.params.id);
      
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  }

  static async generateBukuInduk(req: Request, res: Response) {
    try {
      const completeStudentData = await StudentService.getStudentCompleteData(req.params.id);
      if (!completeStudentData) return res.status(404).json({ error: "Not found" });

      // Build data payload for the PDF template using real data from all tables
      const templateData = {
        student: completeStudentData,
        parents: completeStudentData.parents && completeStudentData.parents.length > 0 ? completeStudentData.parents : [],
        education: completeStudentData.education && completeStudentData.education.length > 0 ? completeStudentData.education[0] : {},
        physical: completeStudentData.physical && completeStudentData.physical.length > 0 ? completeStudentData.physical[0] : {},
        grades: completeStudentData.grades || [],
        attendance: completeStudentData.attendance || [],
        extracurriculars: completeStudentData.extracurriculars || [],
        p5: completeStudentData.p5 || [],
        finalStatus: completeStudentData.finalStatus || []
      };

      await AuditLogger.log(req, "EXPORT_STUDENT_PDF", "student", req.params.id);

      const htmlContent = generateBukuIndukTemplate(templateData);

      const launchOptions: any = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' } });
      await browser.close();

      // Puppeteer returns Uint8Array; convert to Node Buffer so Express sends raw binary
      const pdfNodeBuffer = Buffer.from(pdfBuffer);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfNodeBuffer.length.toString());
      res.setHeader('Content-Disposition', `attachment; filename="Buku_Induk_${completeStudentData.nis || completeStudentData.id}.pdf"`);
      res.end(pdfNodeBuffer);
    } catch (error: any) {
      console.error('[BukuInduk PDF Error]', error.message, error.stack);
      res.status(500).json({ error: "Failed to generate PDF Buku Induk", details: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      if (req.body.student || req.body.parents || req.body.education || req.body.physical || req.body.grades || req.body.attendance || req.body.extracurriculars || req.body.p5) {
        // Complete Data Update
        const updated = await StudentService.saveStudentCompleteData(req.params.id, req.body);
        
        await AuditLogger.log(req, "UPDATE_STUDENT", "student", req.params.id, { complete: true });
        
        res.json(updated);
      } else {
        // Legacy simple update
        const updated = await StudentService.updateStudent(req.params.id, req.body);
        
        await AuditLogger.log(req, "UPDATE_STUDENT", "student", req.params.id, { partial: true });
        
        res.json(updated);
      }
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
        return res.status(404).json({ error: "Data siswa tidak ditemukan. Pastikan Nama, Tempat Lahir, dan Tanggal Lahir sudah benar." });
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

  // --- Class Mapels (Buku Induk) ---
  static async getClassMapels(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const data = await StudentService.getClassMapels(classId);
      res.json(data || { classId, mapels: [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch class mapels" });
    }
  }

  static async updateClassMapels(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { mapels } = req.body;
      if (!Array.isArray(mapels)) {
        return res.status(400).json({ error: "mapels must be an array" });
      }
      const data = await StudentService.updateClassMapels(classId, mapels);
      res.json({ message: "Berhasil menyimpan mapel kelas", data });
    } catch (error) {
      res.status(500).json({ error: "Failed to update class mapels" });
    }
  }

  static async copyClassMapels(req: Request, res: Response) {
    try {
      const { sourceClassId, targetClassId } = req.body;
      if (!sourceClassId || !targetClassId) {
        return res.status(400).json({ error: "sourceClassId and targetClassId required" });
      }
      const data = await StudentService.copyClassMapels(sourceClassId, targetClassId);
      res.json({ message: "Berhasil menyalin mapel kelas", data });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to copy class mapels" });
    }
  }
}
