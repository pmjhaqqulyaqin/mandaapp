import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { GalleryController } from "./controller";

const router = Router();

// Configure multer for gallery upload
const uploadDir = path.resolve(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `gallery_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for gallery
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|svg|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.get("/", GalleryController.getImages);
router.post("/", GalleryController.createImage);
router.post("/upload", upload.single("image"), GalleryController.uploadImage);
router.delete("/:id", GalleryController.deleteImage);
router.put("/:id", GalleryController.updateImage);

export const galleryRoutes = router;
