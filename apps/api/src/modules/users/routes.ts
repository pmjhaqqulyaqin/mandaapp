import { Router } from "express";
import {
  getAuditLogsHandler,
  getRolesHandler,
  selectOwnRoleHandler,
  getRoleMenuPermissionsHandler,
  updateRoleMenuPermissionsHandler,
  getUsersDropdownHandler,
} from "./controller";

const router = Router();

router.get("/audit-logs", getAuditLogsHandler);
router.get("/roles", getRolesHandler);
router.get("/dropdown", getUsersDropdownHandler);
router.post("/select-role", selectOwnRoleHandler);
router.get("/role-permissions", getRoleMenuPermissionsHandler);
router.put("/role-permissions", updateRoleMenuPermissionsHandler);

export const usersRoutes = router;
