import { Router } from "express";
import { StudentController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Public endpoints (no auth needed)
router.post("/public-search", StudentController.publicSearch);
router.get("/search-autocomplete", StudentController.autocompleteSearch);

// Protected endpoints (staff only)
router.get("/", requireStaff, StudentController.getAll);
router.post("/", requireStaff, StudentController.create);
router.get("/template", requireStaff, StudentController.downloadTemplate);
router.post("/upload", requireStaff, upload.single("file"), StudentController.uploadExcel);
router.get("/revisions", requireStaff, StudentController.getRevisions);
router.post("/pull-from-nis", requireStaff, StudentController.pullFromNIS);
router.put("/bulk-update", requireStaff, StudentController.bulkUpdate);
router.get("/:id", requireStaff, StudentController.getById);
router.put("/:id", requireStaff, StudentController.update);
router.delete("/:id", requireStaff, StudentController.delete);
router.post("/revisions", requireStaff, StudentController.createRevision);
router.put("/revisions/:id", requireStaff, StudentController.updateRevision);

export const studentRoutes = router;
