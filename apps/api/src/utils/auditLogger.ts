import { db } from "../db";
import { auditLogs } from "../db/schema";
import { Request } from "express";
import logger from "../lib/logger";

// SEC-12: Comprehensive audit action types
type AuditAction =
  | "VIEW_STUDENT" | "UPDATE_STUDENT" | "DELETE_STUDENT" | "EXPORT_STUDENT_PDF"
  | "BULK_UPDATE" | "BULK_DELETE"
  | "LOGIN" | "LOGOUT" | "LOGIN_FAILED"
  | "ROLE_CHANGE" | "USER_BANNED" | "USER_UNBANNED" | "USER_DELETED"
  | "SETTINGS_CHANGE"
  | "FILE_UPLOAD" | "FILE_DELETE"
  | "PPDB_SUBMIT" | "PPDB_STATUS_CHANGE"
  | "BACKUP_DB" | "VIEW_AUDIT_LOGS"
  | "JURNAL_APPROVE" | "JURNAL_REJECT"
  | "INTEGRATION_KEY_CREATE" | "INTEGRATION_KEY_DELETE"
  | "DATA_EXPORT" | "DATA_IMPORT";

export const AuditLogger = {
  async log(req: Request, action: AuditAction, targetType: string, targetId: string | null = null, details: any = null) {
    try {
      const userId = req.authUser?.id;
      if (!userId) return; // If no user (e.g., public route), skip logging

      await db.insert(auditLogs).values({
        userId,
        action,
        targetType,
        targetId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req.ip || req.connection.remoteAddress || null
      });
    } catch (error) {
      // SEC-12: Use structured logger instead of console.error
      logger.error({ err: error, action, targetType }, "[Audit Logger] Failed to log action");
    }
  }
};
