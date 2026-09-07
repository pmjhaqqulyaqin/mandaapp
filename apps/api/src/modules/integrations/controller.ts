import { Request, Response } from 'express';
import { db } from '../../db';
import { integrationApps, employees, classes, studentProfiles, attendanceRecords } from '../../db/schema';
import { eq, gte, and, or, ilike, notIlike, isNotNull, isNull, not, sql, count } from 'drizzle-orm';
import crypto from 'crypto';
import logger from '../../lib/logger';

function generateApiKey(): string {
  return 'sk_live_' + crypto.randomBytes(24).toString('hex');
}

/** Hash an API key with SHA-256 for secure storage */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// -------------------------------------------------------------
// Public Sync Endpoints (Protected by API Key)
// -------------------------------------------------------------

export const getEmployeesSync = async (req: Request, res: Response) => {
  try {
    const lastSync = req.query.last_sync as string;
    // PERF-02: Add pagination to prevent unbounded queries
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 500));
    const offset = (page - 1) * limit;

    // SEC-13: Explicit column selection instead of select() all
    let query = db.select({
      id: employees.id,
      name: employees.name,
      nip: employees.nip,
      type: employees.type,
      position: employees.position,
      gender: employees.gender,
      status: employees.status,
      kodeGuru: employees.kodeGuru,
      updatedAt: employees.updatedAt,
    }).from(employees);
    
    if (lastSync) {
      const syncDate = new Date(lastSync);
      if (!isNaN(syncDate.getTime())) {
        query = query.where(gte(employees.updatedAt, syncDate)) as any;
      }
    }

    const data = await (query as any).limit(limit).offset(offset);
    res.json({
      success: true,
      page,
      limit,
      count: data.length,
      data
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in getEmployeesSync');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getClassesStudentsSync = async (req: Request, res: Response) => {
  try {
    const lastSync = req.query.last_sync as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    // Increased default from 500 → 10000 to prevent silent data loss for typical school sizes.
    // Consumer PHP scripts typically don't paginate, so a single request must return all students.
    const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit as string) || 10000));
    const offset = (page - 1) * limit;
    
    // Get all classes
    const allClasses = await db.select().from(classes);
    
    // Build a classId -> className lookup map from the classes table
    const classMap = new Map<string, string>();
    for (const cls of allClasses) {
      classMap.set(cls.id, cls.name);
    }
    
    // Build where condition for students — use exclusion list (blacklist) instead of whitelist.
    // Previously only matched 'active'/'aktif'/null which missed students with empty string
    // status or other non-standard values (e.g. imported from NIS module).
    // Now we include ALL students EXCEPT those with explicitly inactive statuses.
    const notExcluded = and(
      notIlike(studentProfiles.status, 'lulus'),
      notIlike(studentProfiles.status, 'pindah'),
      notIlike(studentProfiles.status, 'keluar'),
      notIlike(studentProfiles.status, 'tidak aktif')
    );
    // Also include students with null or empty status
    const activeCondition = or(
      isNull(studentProfiles.status),
      eq(studentProfiles.status, ''),
      notExcluded
    );

    let whereCondition;
    if (lastSync) {
      const syncDate = new Date(lastSync);
      if (!isNaN(syncDate.getTime())) {
        whereCondition = and(
          activeCondition,
          gte(studentProfiles.updatedAt, syncDate)
        );
      } else {
        whereCondition = activeCondition;
      }
    } else {
      whereCondition = activeCondition;
    }

    // Run data query + total count in parallel
    const [students, totalResult] = await Promise.all([
      db.select().from(studentProfiles)
        .where(whereCondition)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(studentProfiles)
        .where(whereCondition),
    ]);

    const total = totalResult[0]?.count || 0;

    // Resolve className from classes table
    const resolvedStudents = students.map(s => ({
      ...s,
      className: (s.classId && classMap.get(s.classId)) || s.className || null,
    }));

    res.json({
      success: true,
      page,
      limit,
      count: resolvedStudents.length,
      total,         // Total active students across all pages
      totalPages: Math.ceil(total / limit),
      data: {
        classes: allClasses,
        students: resolvedStudents
      }
    });
  } catch (error) {
    console.error('Error in getClassesStudentsSync:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAttendancesSync = async (req: Request, res: Response) => {
  try {
    const lastSync = req.query.last_sync as string;
    // PERF-02: Add pagination to prevent unbounded queries
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 500));
    const offset = (page - 1) * limit;

    let query = db.select().from(attendanceRecords);
    
    if (lastSync) {
      const syncDate = new Date(lastSync);
      if (!isNaN(syncDate.getTime())) {
        query = query.where(gte(attendanceRecords.updatedAt, syncDate)) as any;
      }
    }

    const data = await (query as any).limit(limit).offset(offset);
    res.json({
      success: true,
      page,
      limit,
      count: data.length,
      data
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in getAttendancesSync');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// -------------------------------------------------------------
// Admin Endpoints for Dashboard (API Key Management)
// -------------------------------------------------------------

export const getApps = async (req: Request, res: Response) => {
  try {
    const apps = await db.select().from(integrationApps);
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch integration apps' });
  }
};

export const createApp = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const rawApiKey = generateApiKey();
    const hashedKey = hashApiKey(rawApiKey);
    const newApp = await db.insert(integrationApps).values({
      name,
      apiKey: hashedKey,
      isActive: true,
      createdBy: req.authUser?.id || null
    }).returning();

    // Return raw key ONCE — it cannot be retrieved again
    res.json({
      ...newApp[0],
      apiKey: rawApiKey,
      _notice: 'Simpan API Key ini sekarang. Key tidak dapat ditampilkan lagi setelah halaman ini ditutup.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create integration app' });
  }
};

export const updateAppStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const updated = await db.update(integrationApps)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(integrationApps.id, id))
      .returning();
      
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update app' });
  }
};

export const deleteApp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(integrationApps).where(eq(integrationApps.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete app' });
  }
};
