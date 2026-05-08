import { Router } from "express";
import { AttendanceController } from "./controller";
import { requireStaff, requireAdmin } from "../auth/middleware";

const router = Router();

// ─── Public endpoint (NO AUTH - for gate scanner devices) ─────────────────
router.post("/scan", AttendanceController.scan);

// ─── Stats & Log (public read for scanner dashboard) ─────────────────────
router.get("/today/stats", AttendanceController.getStatsToday);
router.get("/today/log", AttendanceController.getLogToday);

router.post("/manual/bulk", requireStaff, AttendanceController.manualBulkInput);
router.post("/manual", requireStaff, AttendanceController.manualInput);
router.get("/weekly-stats", requireStaff, AttendanceController.getWeeklyStats);
router.get("/recap/daily", requireStaff, AttendanceController.getRecapDaily);
router.get("/recap/monthly", requireStaff, AttendanceController.getRecapMonthly);
router.get("/student/:id", requireStaff, AttendanceController.getStudentHistory);
router.put("/:id", requireStaff, AttendanceController.updateRecord);
router.delete("/:id", requireStaff, AttendanceController.deleteRecord);

// ─── Settings (admin only) ───────────────────────────────────────────────
router.get("/settings", requireStaff, AttendanceController.getSettings);
router.put("/settings", requireAdmin, AttendanceController.updateSettings);

export const attendanceRoutes = router;
