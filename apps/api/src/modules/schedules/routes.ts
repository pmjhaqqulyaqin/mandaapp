import { Router } from "express";
import { ScheduleController } from "./controller";

const router = Router();

router.get("/", ScheduleController.getAll);
router.post("/", ScheduleController.create);
router.put("/:id", ScheduleController.update);
router.delete("/:id", ScheduleController.delete);

export const schedulesRoutes = router;
