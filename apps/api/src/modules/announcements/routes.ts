import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { AnnouncementController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Configure multer for announcement image upload
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `announcement_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|svg|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public
router.get("/active", AnnouncementController.getActive);

// Protected (staff only)
router.get("/", requireStaff, AnnouncementController.getAll);
router.post("/", requireStaff, AnnouncementController.create);
router.put("/:id", requireStaff, AnnouncementController.update);
router.delete("/:id", requireStaff, AnnouncementController.delete);
router.patch("/:id/toggle", requireStaff, AnnouncementController.toggleActive);
router.post("/upload", requireStaff, upload.single("image"), AnnouncementController.uploadImage);

export const announcementsRoutes = router;
