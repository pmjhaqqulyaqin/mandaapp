import { Router } from "express";
import { JurnalController } from "./controller";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

// Reuse upload config pattern from system module
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), "uploads")),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `jurnal-${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB for Excel

const router = Router();

// All routes require staff auth (applied at index.ts level via requireStaff or per-route)

// Teaching Subjects (Jadwal Mengajar)
router.get("/schedule-today", JurnalController.getScheduleToday);
router.get("/teaching-subjects", JurnalController.getTeachingSubjects);
router.post("/teaching-subjects", JurnalController.createTeachingSubject);
router.put("/teaching-subjects/:id", JurnalController.updateTeachingSubject);
router.delete("/teaching-subjects/:id", JurnalController.deleteTeachingSubject);
router.post("/teaching-subjects/bulk", JurnalController.bulkCreateTeachingSubjects);
router.get("/teaching-subjects/template", JurnalController.downloadTemplate);
router.post("/teaching-subjects/import", memoryUpload.single("file"), JurnalController.importExcel);

// Jurnal Entries
router.get("/entries", JurnalController.getJurnalEntries);
router.post("/entries", JurnalController.createJurnalEntry);
router.get("/entries/:id", JurnalController.getJurnalById);
router.put("/entries/:id", JurnalController.updateJurnalEntry);
router.delete("/entries/:id", JurnalController.deleteJurnalEntry);
router.post("/entries/:id/submit", JurnalController.submitJurnal);
router.post("/entries/:id/approve", JurnalController.approveJurnal);
router.post("/entries/:id/reject", JurnalController.rejectJurnal);

// Student Attendance per Mapel
router.get("/entries/:id/attendance", JurnalController.getStudentAttendance);
router.post("/entries/:id/attendance", JurnalController.saveStudentAttendance);
router.get("/class-students/:classId", JurnalController.getClassStudents);

// Attachments
router.post("/attachments", upload.single("file"), JurnalController.addAttachment);
router.delete("/attachments/:id", JurnalController.deleteAttachment);

// Monitoring & Recap
router.get("/monitoring", JurnalController.getMonitoring);
router.get("/recap", JurnalController.getRecap);

// Templates
router.get("/templates", JurnalController.getTemplates);
router.post("/templates", JurnalController.createTemplate);
router.post("/templates/:id/use", JurnalController.useTemplate);
router.delete("/templates/:id", JurnalController.deleteTemplate);

export const jurnalRoutes = router;
