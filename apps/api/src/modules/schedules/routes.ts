import { Router } from "express";
import { ScheduleController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - students need to see schedules
router.get("/", ScheduleController.getAll);

// Protected (staff only)
router.post("/", requireStaff, ScheduleController.create);
router.put("/:id", requireStaff, ScheduleController.update);
router.delete("/:id", requireStaff, ScheduleController.delete);

export const schedulesRoutes = router;
