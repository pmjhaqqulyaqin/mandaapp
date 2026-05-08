import { Router } from "express";
import { AnalyticsController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

router.get("/summary", requireStaff, AnalyticsController.getSummary);
router.get("/classroom-monitor", requireStaff, AnalyticsController.getClassroomMonitor);
router.get("/recent-activity", requireStaff, AnalyticsController.getRecentActivity);
router.get("/upcoming-events", requireStaff, AnalyticsController.getUpcomingEvents);
router.get("/ikm", requireStaff, AnalyticsController.getIKMSummary);

export default router;
