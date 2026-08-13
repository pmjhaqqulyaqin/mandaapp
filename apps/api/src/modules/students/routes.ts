import { Router } from "express";
import { StudentController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage() });

// --- Photo upload for self-service (disk storage for sharp conversion) ---
const photoUploadDir = path.resolve(__dirname, "../../../uploads/students");
if (!fs.existsSync(photoUploadDir)) {
  fs.mkdirSync(photoUploadDir, { recursive: true });
}
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photoUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}${ext}`);
  },
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WebP) yang diizinkan"));
    }
  },
});

const router = Router();

// Public endpoints (no auth needed)
router.post("/public-search", StudentController.publicSearch);
router.post("/public-verify-nisn", StudentController.publicVerifyNisn);
router.get("/search-autocomplete", StudentController.autocompleteSearch);
router.get("/public-alumni", StudentController.getPublicAlumni);

// Self-service data update (public — no auth)
router.post("/self-update/search", StudentController.selfUpdateSearch);
router.post("/self-update/get-data", StudentController.selfUpdateGetData);
router.post("/self-update/save", StudentController.selfUpdateSave);
router.post("/self-update/upload-photo", photoUpload.single("photo"), StudentController.selfUpdateUploadPhoto);

// Protected endpoints (staff only)
router.get("/", requireStaff, StudentController.getAll);
router.post("/", requireStaff, StudentController.create);
router.get("/template", requireStaff, StudentController.downloadTemplate);
router.post("/upload", requireStaff, upload.single("file"), StudentController.uploadExcel);
router.get("/revisions", requireStaff, StudentController.getRevisions);
router.post("/pull-from-nis", requireStaff, StudentController.pullFromNIS);
router.put("/bulk-update", requireStaff, StudentController.bulkUpdate);

// Class-Specific Mapel (Buku Induk)
router.post("/class-mapels/copy", requireStaff, StudentController.copyClassMapels);
router.get("/class-mapels/:classId", requireStaff, StudentController.getClassMapels);
router.put("/class-mapels/:classId", requireStaff, StudentController.updateClassMapels);

router.get("/:id", requireStaff, StudentController.getById);
router.get("/:id/buku-induk/pdf", requireStaff, StudentController.generateBukuInduk);
router.put("/:id", requireStaff, StudentController.update);
router.delete("/:id", requireStaff, StudentController.delete);
router.post("/revisions", requireStaff, StudentController.createRevision);
router.put("/revisions/:id", requireStaff, StudentController.updateRevision);

export const studentRoutes = router;
