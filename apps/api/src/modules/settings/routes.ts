import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SettingsController } from "./controller";
import { requireStaff } from "../auth/middleware";
import { apiCache, invalidateCache } from "../../middlewares/cache";

const router = Router();

// Configure multer for logo upload
const uploadDir = path.resolve(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|svg|webp|ico)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public (frontend needs settings to render) — PERF-07: cached 5 minutes
router.get("/", apiCache(300, 'settings'), SettingsController.getAll);
router.get("/serve-favicon", SettingsController.serveFavicon);
router.get("/:group", apiCache(300, 'settings'), SettingsController.getByGroup);

// Protected (staff only)
router.put("/", requireStaff, SettingsController.bulkUpdate);
router.post("/upload-logo", requireStaff, upload.single("logo"), SettingsController.uploadLogo);
router.post("/upload-favicon", requireStaff, upload.single("favicon"), SettingsController.uploadFavicon);

export const settingsRoutes = router;
