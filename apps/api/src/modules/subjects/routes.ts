import { Router } from "express";
import { SubjectController } from "./controller";
import { requireAdmin, requireStaff } from "../auth/middleware";

const router = Router();

// Staff can view subjects
router.get("/", requireStaff, SubjectController.getAll);
router.get("/:id", requireStaff, SubjectController.getById);

// Admin / specific roles can manage subjects
router.post("/", requireAdmin, SubjectController.create);
router.put("/:id", requireAdmin, SubjectController.update);
router.delete("/:id", requireAdmin, SubjectController.delete);

export default router;
