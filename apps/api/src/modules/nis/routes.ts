import { Router } from "express";
import { NISController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// All NIS management routes require staff auth
// Dashboard
router.get("/stats", requireStaff, NISController.getStats);
router.get("/recent-activity", requireStaff, NISController.getRecentActivity);

// Academic Years
router.get("/academic-years", requireStaff, NISController.getAcademicYears);
router.post("/academic-years", requireStaff, NISController.createAcademicYear);
router.put("/academic-years/:id/activate", requireStaff, NISController.activateYear);

// Students without NIS
router.get("/students-without-nis", requireStaff, NISController.getStudentsWithoutNIS);
router.get("/pull-candidates", requireStaff, NISController.getPullCandidates);

// Batch Operations
router.post("/preview-batch", requireStaff, NISController.previewBatch);
router.post("/generate-batch", requireStaff, NISController.generateBatch);
router.post("/upload-batch", requireStaff, upload.single("file"), NISController.uploadBatch);
router.post("/import-uploaded-batch", requireStaff, NISController.importUploadedBatch);
router.get("/batch-history", requireStaff, NISController.getBatchHistory);

// Single Assignment
router.get("/next-sequence", requireStaff, NISController.getNextSequence);
router.post("/assign-single", requireStaff, NISController.assignSingle);

// Records
router.get("/records", requireStaff, NISController.getRecords);
router.put("/records/:id", requireStaff, NISController.editRecord);
router.delete("/records/:id/revoke", requireStaff, NISController.revokeRecord);
router.get("/export", requireStaff, NISController.exportRecords);

// Validation
router.get("/check-duplicate/:nis", requireStaff, NISController.checkDuplicate);

export const nisRoutes = router;
