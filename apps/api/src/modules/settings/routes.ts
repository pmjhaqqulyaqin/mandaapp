import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SettingsController } from "./controller";

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

router.get("/", SettingsController.getAll);
router.get("/:group", SettingsController.getByGroup);
router.put("/", SettingsController.bulkUpdate);
router.post("/upload-logo", upload.single("logo"), SettingsController.uploadLogo);
router.post("/upload-favicon", upload.single("favicon"), SettingsController.uploadFavicon);

export const settingsRoutes = router;
