import { Router } from "express";
import { EventController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - calendar is viewable by anyone
router.get("/", EventController.getAll);
router.get("/range", EventController.getByRange);
router.get("/years", EventController.getYears);

// Protected (staff only)
router.post("/", requireStaff, EventController.create);
router.put("/:id", requireStaff, EventController.update);
router.delete("/:id", requireStaff, EventController.delete);

export const eventsRoutes = router;
