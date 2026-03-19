import { Router } from "express";
import { EmployeeController } from "./controller";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", EmployeeController.getAll);
router.get("/template", EmployeeController.downloadTemplate);
router.get("/:id", EmployeeController.getById);
router.post("/", EmployeeController.create);
router.put("/:id", EmployeeController.update);
router.delete("/:id", EmployeeController.delete);
router.post("/upload", upload.single("file"), EmployeeController.uploadExcel);

export default router;
