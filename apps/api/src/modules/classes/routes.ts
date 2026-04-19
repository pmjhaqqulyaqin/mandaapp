import { Router } from "express";
import { ClassController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - needed for student forms/dropdowns
router.get("/", ClassController.getAll);
router.get("/:id", ClassController.getById);

// Protected (staff only)
router.post("/", requireStaff, ClassController.create);
router.put("/:id", requireStaff, ClassController.update);
router.delete("/:id", requireStaff, ClassController.delete);

export default router;
