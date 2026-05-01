const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'ijazah', 'controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add ijazahSubjectMappings import
content = content.replace(
  'ijazahSubjects, \n  ijazahGrades',
  'ijazahSubjects, \n  ijazahSubjectMappings,\n  ijazahGrades'
);

// 2. Replace FASE 2: MATA PELAJARAN up to INLINE EDIT
const phase2Regex = /\/\/ --- FASE 2: MATA PELAJARAN ---[\s\S]*?\/\/ --- INLINE EDIT: Update single grade cell \(untuk siswa mutasi\) ---/;
const phase2Replacement = `// --- FASE 2: MATA PELAJARAN ---

  static async getSubjects(_req: Request, res: Response) {
    try {
      const subjects = await db
        .select()
        .from(ijazahSubjects)
        .where(eq(ijazahSubjects.isActive, true))
        .orderBy(asc(ijazahSubjects.orderNum));
      res.json(subjects);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch Ijazah subjects");
      res.status(500).json({ error: "Gagal mengambil mata pelajaran" });
    }
  }

  static async saveSubject(req: Request, res: Response) {
    try {
      const { id, name, group, orderNum } = req.body;
      if (!name || !group) return res.status(400).json({ error: "Nama mapel dan kelompok wajib diisi" });
      if (id) {
        await db.update(ijazahSubjects)
          .set({ name, group, orderNum: orderNum || 0, updatedAt: new Date() })
          .where(eq(ijazahSubjects.id, id));
      } else {
        await db.insert(ijazahSubjects).values({ name, group, orderNum: orderNum || 0 });
      }
      res.json({ success: true, message: "Mata pelajaran berhasil disimpan" });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal menyimpan mata pelajaran" });
    }
  }

  static async deleteSubject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await db.update(ijazahSubjects).set({ isActive: false, updatedAt: new Date() }).where(eq(ijazahSubjects.id, id));
      res.json({ success: true, message: "Mata pelajaran berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal menghapus mata pelajaran" });
    }
  }

  static async uploadSubjects(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ error: "File Excel tidak ditemukan" });
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) return res.status(400).json({ error: "Worksheet tidak ditemukan di file Excel" });

      let inserted = 0;
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const orderNum = row.getCell(1).value;
        const group = String(row.getCell(2).value || '').trim();
        const name = String(row.getCell(3).value || '').trim();
        if (!name || !group) continue;
        const ord = typeof orderNum === 'number' ? orderNum : rowNumber - 1;
        await db.insert(ijazahSubjects).values({ name, group, orderNum: ord });
        inserted++;
      }
      res.json({ success: true, message: \`\${inserted} entri mata pelajaran berhasil diimpor\` });
    } catch (error: any) {
      res.status(500).json({ error: "Gagal memproses file Excel" });
    }
  }

  static async downloadSubjectTemplate(_req: Request, res: Response) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Mata Pelajaran');
      worksheet.columns = [
        { header: 'Urut', key: 'orderNum', width: 8 },
        { header: 'Kelompok', key: 'group', width: 30 },
        { header: 'Nama Mata Pelajaran', key: 'name', width: 40 },
      ];
      const examples = [
        { orderNum: 1, group: 'Kelompok A', name: 'Pendidikan Agama Islam' },
        { orderNum: 2, group: 'Kelompok B', name: 'Seni Budaya' },
        { orderNum: 3, group: 'Mapel Pilihan', name: 'Biologi' },
      ];
      examples.forEach(ex => worksheet.addRow(ex));
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Template_Master_Mapel.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ error: "Gagal membuat template" });
    }
  }

  // --- MAPPINGS ---
  static async getMappings(_req: Request, res: Response) {
    try {
      const mappings = await db.select().from(ijazahSubjectMappings);
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ error: "Gagal memuat pemetaan mapel" });
    }
  }

  static async saveMapping(req: Request, res: Response) {
    try {
      const { subjectId, classIds, sem1, sem2, sem3, sem4, sem5, um } = req.body;
      if (!subjectId) return res.status(400).json({ error: "subjectId wajib diisi" });

      const existing = await db.select().from(ijazahSubjectMappings).where(eq(ijazahSubjectMappings.subjectId, subjectId)).limit(1);
      
      const cIds = Array.isArray(classIds) ? classIds : [];
      if (existing.length > 0) {
        await db.update(ijazahSubjectMappings)
          .set({ classIds: cIds, sem1: !!sem1, sem2: !!sem2, sem3: !!sem3, sem4: !!sem4, sem5: !!sem5, um: !!um, updatedAt: new Date() })
          .where(eq(ijazahSubjectMappings.id, existing[0].id));
      } else {
        await db.insert(ijazahSubjectMappings).values({
          subjectId, classIds: cIds, sem1: !!sem1, sem2: !!sem2, sem3: !!sem3, sem4: !!sem4, sem5: !!sem5, um: !!um
        });
      }
      res.json({ success: true, message: "Pemetaan disimpan" });
    } catch (error) {
      res.status(500).json({ error: "Gagal menyimpan pemetaan" });
    }
  }

  // --- INLINE EDIT: Update single grade cell (untuk siswa mutasi) ---`;
content = content.replace(phase2Regex, phase2Replacement);

// 3. Replace downloadTemplate logic for subjects
const downloadSubjectsRegex = /\/\/ 1\. Fetch active subjects[\s\S]*?\/\/ 2\. Define Columns/;
const downloadSubjectsReplacement = `// 1. Fetch active subjects and mappings
      const activeSubjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true)).orderBy(asc(ijazahSubjects.orderNum));
      const mappings = await db.select().from(ijazahSubjectMappings);

      const semKey = semester as string;
      const mappingSemKey = semKey === 'examScore' ? 'um' : semKey === 'semester1' ? 'sem1' : semKey === 'semester2' ? 'sem2' : semKey === 'semester3' ? 'sem3' : semKey === 'semester4' ? 'sem4' : 'sem5';

      const subjects = activeSubjects.filter(subj => {
        const map = mappings.find(m => m.subjectId === subj.id);
        if (!map) return false;
        if (!(map as any)[mappingSemKey]) return false;
        
        const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
        if (isGlobal) return true;
        
        if (type === 'rombel' && classId && typeof classId === 'string') {
          return (map.classIds as string[]).includes(classId);
        }
        return false;
      });

      // 2. Define Columns`;
content = content.replace(downloadSubjectsRegex, downloadSubjectsReplacement);

// 4. Replace gradesPreview subjects logic
const previewSubjectsRegex = /\/\/ 1\. Get subjects[\s\S]*?\/\/ 2\. Get students/;
const previewSubjectsReplacement = `// 1. Get subjects and filter by mapping
      const activeSubjects = await db.select().from(ijazahSubjects).where(eq(ijazahSubjects.isActive, true)).orderBy(asc(ijazahSubjects.orderNum));
      const mappings = await db.select().from(ijazahSubjectMappings);
      
      const subjects = activeSubjects.filter(subj => {
        const map = mappings.find(m => m.subjectId === subj.id);
        if (!map) return false;
        const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
        if (isGlobal) return true;
        if (type === 'rombel' && classId && typeof classId === 'string') {
          return (map.classIds as string[]).includes(classId);
        }
        return false;
      });

      // 2. Get students`;
content = content.replace(previewSubjectsRegex, previewSubjectsReplacement);

// 5. Replace getPreview subjects logic (used for export leger/ijazah)
const exportSubjectsRegex = /\/\/ We need to group subjects by name to combine semesters[\s\S]*?\/\/ 3\. Get Students/;
const exportSubjectsReplacement = `// Map mappings to subjects
      const mappings = await db.select().from(ijazahSubjectMappings);
      const subjectMap = new Map<string, any>();
      
      for (const subj of allActiveSubjects) {
        if (selectedNames.length > 0 && !selectedNames.includes(subj.name)) continue;
        const map = mappings.find(m => m.subjectId === subj.id);
        if (!map) continue;
        
        const isGlobal = !map.classIds || (map.classIds as string[]).length === 0;
        if (!isGlobal && !(map.classIds as string[]).includes(classId)) continue; // skip if not applicable to this class

        if (!subjectMap.has(subj.name)) {
          subjectMap.set(subj.name, {
            name: subj.name,
            group: subj.group,
            orderNum: subj.orderNum,
            hasUm: map.um,
            ids: [subj.id]
          });
        }
      }

      const uniqueSubjects = Array.from(subjectMap.values()).sort((a, b) => a.orderNum - b.orderNum);

      // 3. Get Students`;
content = content.replace(exportSubjectsRegex, exportSubjectsReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('controller.ts patched successfully!');
