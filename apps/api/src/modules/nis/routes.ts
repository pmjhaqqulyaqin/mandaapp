import { Router } from "express";
import { NISController } from "./controller";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Dashboard
router.get("/stats", NISController.getStats);
router.get("/recent-activity", NISController.getRecentActivity);

// Academic Years
router.get("/academic-years", NISController.getAcademicYears);
router.post("/academic-years", NISController.createAcademicYear);
router.put("/academic-years/:id/activate", NISController.activateYear);

// Students without NIS
router.get("/students-without-nis", NISController.getStudentsWithoutNIS);
router.get("/pull-candidates", NISController.getPullCandidates);

// Batch Operations
router.post("/preview-batch", NISController.previewBatch);
router.post("/generate-batch", NISController.generateBatch);
router.post("/upload-batch", upload.single("file"), NISController.uploadBatch);
router.get("/batch-history", NISController.getBatchHistory);

// Single Assignment
router.get("/next-sequence", NISController.getNextSequence);
router.post("/assign-single", NISController.assignSingle);

// Records
router.get("/records", NISController.getRecords);
router.put("/records/:id", NISController.editRecord);
router.delete("/records/:id/revoke", NISController.revokeRecord);
router.get("/export", NISController.exportRecords);

// Validation
router.get("/check-duplicate/:nis", NISController.checkDuplicate);

export const nisRoutes = router;
