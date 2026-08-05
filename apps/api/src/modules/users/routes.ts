import { Router } from "express";
import {
  getAuditLogsHandler,
  getRolesHandler,
  selectOwnRoleHandler,
  setupAccountHandler,
  getRoleMenuPermissionsHandler,
  updateRoleMenuPermissionsHandler,
  getUserMenuPermissionsHandler,
  updateUserMenuPermissionsHandler,
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
router.get("/user-permissions", requireStaff, getUserMenuPermissionsHandler);

// Admin only
router.put("/role-permissions", requireAdmin, updateRoleMenuPermissionsHandler);
router.put("/user-permissions", requireAdmin, updateUserMenuPermissionsHandler);
router.delete("/:id", requireAdmin, deleteUserHandler);

export const usersRoutes = router;
