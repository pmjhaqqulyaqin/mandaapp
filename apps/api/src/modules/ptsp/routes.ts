import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as controller from "./controller";
import { requireStaff } from "../auth/middleware";

export const ptspRoutes = Router();

// Configure multer
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ptsp_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Public Routes
ptspRoutes.post("/submit", upload.any(), controller.handleSubmit);
ptspRoutes.get("/track/:ticketId", controller.handleTrack);

// Admin Routes (staff auth required)
ptspRoutes.get("/", requireStaff, controller.handleGetAll);
ptspRoutes.patch("/:id/status", requireStaff, controller.handleUpdateStatus);
ptspRoutes.delete("/:id", requireStaff, controller.handleDelete);
