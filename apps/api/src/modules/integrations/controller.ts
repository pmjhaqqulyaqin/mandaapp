import { Request, Response } from 'express';
import { db } from '../../db';
import { integrationApps, employees, classes, studentProfiles, attendanceRecords } from '../../db/schema';
import { eq, gte, and, or, ilike, isNotNull, isNull } from 'drizzle-orm';
import crypto from 'crypto';

function generateApiKey(): string {
  return 'sk_live_' + crypto.randomBytes(24).toString('hex');
}

// -------------------------------------------------------------
// Public Sync Endpoints (Protected by API Key)
// -------------------------------------------------------------

export const getEmployeesSync = async (req: Request, res: Response) => {
  try {
    const lastSync = req.query.last_sync as string;
    let query = db.select().from(employees);
    
    if (lastSync) {
      const syncDate = new Date(lastSync);
      if (!isNaN(syncDate.getTime())) {
        query = query.where(gte(employees.updatedAt, syncDate)) as any;
      }
    }

    const data = await query;
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error in getEmployeesSync:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getClassesStudentsSync = async (req: Request, res: Response) => {
  try {
    const lastSync = req.query.last_sync as string;
    
    // Get all classes
    const allClasses = await db.select().from(classes);
    
    // Build a classId -> className lookup map from the classes table
    const classMap = new Map<string, string>();
    for (const cls of allClasses) {
      classMap.set(cls.id, cls.name);
    }
    
    // Build where condition for students
    // Match 'active', 'aktif' (case-insensitive), AND NULL status to be consistent
    // with MandaApp dashboard which treats null/undefined as active: (s.status || 'active')
    const activeCondition = or(
      ilike(studentProfiles.status, 'active'),
      ilike(studentProfiles.status, 'aktif'),
      isNull(studentProfiles.status)
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

    const students = await db.select().from(studentProfiles).where(whereCondition);

    // Resolve className from classes table (classId -> classes.name)
    // This ensures the sync output matches the MandaApp dashboard,
    // since studentProfiles.className is a legacy field that may be stale.
    const resolvedStudents = students.map(s => ({
      ...s,
      className: (s.classId && classMap.get(s.classId)) || s.className || null,
    }));

    res.json({
      success: true,
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
    let query = db.select().from(attendanceRecords);
    
    if (lastSync) {
      const syncDate = new Date(lastSync);
      if (!isNaN(syncDate.getTime())) {
        query = query.where(gte(attendanceRecords.updatedAt, syncDate)) as any;
      }
    }

    const data = await query;
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error in getAttendancesSync:', error);
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

    const apiKey = generateApiKey();
    const newApp = await db.insert(integrationApps).values({
      name,
      apiKey,
      isActive: true,
      createdBy: (req as any).user?.id // Assuming auth middleware sets this
    }).returning();

    res.json(newApp[0]);
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
