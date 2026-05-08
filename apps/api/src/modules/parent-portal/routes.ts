import { Router } from "express";
import { ParentPortalController } from "./controller";
import { requireAuth, requireStaff } from "../auth/middleware";

const router = Router();

const requireParent = requireAuth(['orang_tua']);

// ─── Parent Endpoints ────────────────────────────────────────
router.post("/pair", requireParent, ParentPortalController.pairChild);
router.get("/children", requireParent, ParentPortalController.getChildren);
router.get("/student/:studentId", requireParent, ParentPortalController.getStudentDetail);
router.get("/student/:studentId/attendance", requireParent, ParentPortalController.getAttendance);
router.get("/student/:studentId/jurnal", requireParent, ParentPortalController.getJurnal);
router.get("/student/:studentId/schedule", requireParent, ParentPortalController.getSchedule);
router.get("/student/:studentId/trend", requireParent, ParentPortalController.getWeeklyTrend);
router.delete("/link/:linkId", requireParent, ParentPortalController.unlinkChild);
router.put("/link/:linkId/notification", requireParent, ParentPortalController.updateNotification);

// ─── Admin Endpoints ─────────────────────────────────────────
router.get("/admin/student/:studentId/parents", requireStaff, ParentPortalController.getLinksForStudent);
router.get("/admin/notif-settings", requireStaff, ParentPortalController.getNotifSettings);
router.put("/admin/notif-settings", requireStaff, ParentPortalController.updateNotifSettings);

export const parentPortalRoutes = router;
