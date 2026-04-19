import { Router } from "express";
import { CardSettingsController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - for public card printing page
router.get("/settings", CardSettingsController.get);

// Protected (staff only)
router.put("/settings", requireStaff, CardSettingsController.update);

export const cardsRoutes = router;
