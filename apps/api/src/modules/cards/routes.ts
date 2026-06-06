import { Router } from "express";
import { CardSettingsController, CardPrintHistoryController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - for public card printing page
router.get("/settings", CardSettingsController.get);

// Protected (staff only)
router.put("/settings", requireStaff, CardSettingsController.update);

// Print History (staff only)
router.get("/print-history", requireStaff, CardPrintHistoryController.getHistory);
router.get("/print-history/stats", requireStaff, CardPrintHistoryController.getStats);
router.post("/print-history", requireStaff, CardPrintHistoryController.logPrint);

export const cardsRoutes = router;
