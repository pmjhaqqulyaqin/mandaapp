import { Router } from "express";
import { EmployeeController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diperbolehkan'));
  }
});

// ── Self-service profile endpoints (any authenticated staff) ──
router.get("/me", requireStaff, EmployeeController.getMe);
router.get("/lookup/:nip", requireStaff, EmployeeController.lookupByNip);
router.post("/link-by-nip", requireStaff, EmployeeController.linkByNip);
router.post("/unlink", requireStaff, EmployeeController.unlink);
router.post("/me/photo", requireStaff, upload.single("photo"), EmployeeController.uploadPhoto);

// ── Admin CRUD endpoints ──
router.get("/", requireStaff, EmployeeController.getAll);
router.get("/template", requireStaff, EmployeeController.downloadTemplate);
router.get("/:id", requireStaff, EmployeeController.getById);
router.post("/", requireStaff, EmployeeController.create);
router.put("/:id", requireStaff, EmployeeController.update);
router.delete("/:id", requireStaff, EmployeeController.delete);
router.post("/upload", requireStaff, upload.single("file"), EmployeeController.uploadExcel);

export default router;
