import { Router } from "express";
import { WaController } from "./controller";
import { requireAdmin } from "../auth/middleware";

const router = Router();

// All WA admin routes require admin authentication
router.get("/settings",            requireAdmin, WaController.getSettings);
router.put("/settings",            requireAdmin, WaController.saveSettings);
router.get("/status",              requireAdmin, WaController.getStatus);
router.get("/stats",               requireAdmin, WaController.getStats);
router.get("/logs",                requireAdmin, WaController.getLogs);
router.post("/test",               requireAdmin, WaController.testSend);
router.post("/retry/:logId",       requireAdmin, WaController.retryFailed);
router.get("/coverage",            requireAdmin, WaController.getCoverage);
router.get("/template",            requireAdmin, WaController.getTemplate);
router.put("/template",            requireAdmin, WaController.saveTemplate);
router.post("/template/reset",     requireAdmin, WaController.resetTemplate);
router.post("/template/preview",   requireAdmin, WaController.previewTemplate);

export default router;
