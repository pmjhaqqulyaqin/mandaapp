import { Router } from "express";
import { EmployeeController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All employee routes are staff-protected
router.get("/", requireStaff, EmployeeController.getAll);
router.get("/me", requireStaff, EmployeeController.getMe);
router.get("/template", requireStaff, EmployeeController.downloadTemplate);
router.get("/:id", requireStaff, EmployeeController.getById);
router.post("/", requireStaff, EmployeeController.create);
router.put("/:id", requireStaff, EmployeeController.update);
router.delete("/:id", requireStaff, EmployeeController.delete);
router.post("/upload", requireStaff, upload.single("file"), EmployeeController.uploadExcel);

export default router;
