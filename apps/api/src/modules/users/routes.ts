import { Router } from "express";
import {
  getAuditLogsHandler,
  getRolesHandler,
  selectOwnRoleHandler,
  setupAccountHandler,
  getRoleMenuPermissionsHandler,
  updateRoleMenuPermissionsHandler,
  getUsersDropdownHandler,
  deleteUserHandler,
} from "./controller";
import { requireAuth, requireAdmin, requireStaff } from "../auth/middleware";

const router = Router();

// Authenticated (any logged-in user can select their own role)
router.post("/select-role", requireAuth(), selectOwnRoleHandler);
router.post("/setup-account", requireAuth(), setupAccountHandler);

// Staff only
router.get("/audit-logs", requireStaff, getAuditLogsHandler);
router.get("/roles", requireStaff, getRolesHandler);
router.get("/dropdown", requireStaff, getUsersDropdownHandler);
router.get("/role-permissions", requireStaff, getRoleMenuPermissionsHandler);

// Admin only
router.put("/role-permissions", requireAdmin, updateRoleMenuPermissionsHandler);
router.delete("/:id", requireAdmin, deleteUserHandler);

export const usersRoutes = router;
