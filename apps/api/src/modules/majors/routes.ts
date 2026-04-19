import { Router } from "express";
import { MajorController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - needed for student forms/dropdowns
router.get("/", MajorController.getAll);
router.get("/:id", MajorController.getById);

// Protected (staff only)
router.post("/", requireStaff, MajorController.create);
router.put("/:id", requireStaff, MajorController.update);
router.delete("/:id", requireStaff, MajorController.delete);

export default router;
