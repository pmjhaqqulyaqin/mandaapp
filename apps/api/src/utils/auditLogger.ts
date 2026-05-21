import { db } from "../db";
import { auditLogs } from "../db/schema";
import { Request } from "express";

type AuditAction = "VIEW_STUDENT" | "UPDATE_STUDENT" | "EXPORT_STUDENT_PDF" | "BACKUP_DB" | "VIEW_AUDIT_LOGS";

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
      console.error("[Audit Logger Error] Failed to log action:", error);
    }
  }
};
