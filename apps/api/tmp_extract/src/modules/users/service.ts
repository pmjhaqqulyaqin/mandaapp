import { db } from "../../db";
import { auditLogs, user } from "../../db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface AuditLogEntry {
  userId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      details: entry.details || null,
      ipAddress: entry.ipAddress || null,
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filters: AuditLogFilters) {
  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: user.name,
        userEmail: user.email,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.userId, user.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  return {
    logs,
    total: Number(countResult[0]?.count || 0),
    limit,
    offset,
  };
}
