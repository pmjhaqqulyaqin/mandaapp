import { Router } from "express";
import { IjazahController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Endpoint Phase 1
router.get("/classes", requireStaff, IjazahController.getGrade12Classes);
router.get("/students", requireStaff, IjazahController.getGrade12Students);

// Endpoint Phase 2: Settings
router.get("/settings", requireStaff, IjazahController.getSettings);
router.post("/settings", requireStaff, IjazahController.saveSettings);

// Endpoint Phase 2: Subjects
router.get("/subjects", requireStaff, IjazahController.getSubjects);
router.post("/subjects", requireStaff, IjazahController.saveSubject);
router.delete("/subjects/:id", requireStaff, IjazahController.deleteSubject);
router.post("/subjects/upload", requireStaff, upload.single("file"), IjazahController.uploadSubjects);

// Endpoint Phase 3: Grades Upload & Template
router.get("/download-template", requireStaff, IjazahController.downloadTemplate);
router.post("/upload-grades", requireStaff, upload.single("file"), IjazahController.uploadGrades);

// Endpoint Phase 4: Preview & Export
router.get("/preview", requireStaff, IjazahController.getPreview);
router.get("/export", requireStaff, IjazahController.exportData);

export const ijazahRoutes = router;
