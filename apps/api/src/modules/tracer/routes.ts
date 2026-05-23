import { Router } from "express";
import { TracerController } from "./controller";
import { requireStaff } from "../auth/middleware";

import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Public endpoints
router.post("/:id/responses", TracerController.submitResponse);
router.post("/upload-bukti", upload.single("file"), TracerController.uploadBukti);

// Protected endpoints
router.get("/", requireStaff, TracerController.getAllStudies);
router.post("/", requireStaff, TracerController.createStudy);
router.get("/:id", requireStaff, TracerController.getStudyById);
router.put("/:id", requireStaff, TracerController.updateStudy);
router.delete("/:id", requireStaff, TracerController.deleteStudy);
router.get("/:id/responses", requireStaff, TracerController.getResponses);

export const tracerRoutes = router;
