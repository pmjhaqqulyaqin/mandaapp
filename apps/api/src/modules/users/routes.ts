import { Router } from "express";
import {
  getAuditLogsHandler,
  getRolesHandler,
  selectOwnRoleHandler,
  getRoleMenuPermissionsHandler,
  updateRoleMenuPermissionsHandler,
  getUsersDropdownHandler,
} from "./controller";
import { requireAuth, requireAdmin, requireStaff } from "../auth/middleware";

const router = Router();

// Authenticated (any logged-in user can select their own role)
router.post("/select-role", requireAuth(), selectOwnRoleHandler);

// Staff only
router.get("/audit-logs", requireStaff, getAuditLogsHandler);
router.get("/roles", requireStaff, getRolesHandler);
router.get("/dropdown", requireStaff, getUsersDropdownHandler);
router.get("/role-permissions", requireStaff, getRoleMenuPermissionsHandler);

// Admin only
router.put("/role-permissions", requireAdmin, updateRoleMenuPermissionsHandler);

export const usersRoutes = router;
