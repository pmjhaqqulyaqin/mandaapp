import { Router } from "express";
import { eq, desc, and, gte, lte, sql, ilike, or } from "drizzle-orm";
import { db } from "../../db";
import { mutationRecords, studentProfiles } from "../../db/schema";

const router = Router();

// Manual validation helper (zod not available in this project)
function validateMutationData(body: any, partial = false) {
  const validTypes = ["masuk", "keluar", "internal"];
  const validStatuses = ["aktif", "draft", "batal"];

  if (!partial && (!body.studentId || typeof body.studentId !== "string")) {
    throw new Error("studentId is required");
  }
  if (!partial && (!body.type || !validTypes.includes(body.type))) {
    throw new Error("type must be one of: masuk, keluar, internal");
  }
  if (body.type && !validTypes.includes(body.type)) {
    throw new Error("type must be one of: masuk, keluar, internal");
  }
  if (body.status && !validStatuses.includes(body.status)) {
    throw new Error("status must be one of: aktif, draft, batal");
  }

  return {
    ...(body.studentId && { studentId: body.studentId }),
    ...(body.type && { type: body.type }),
    ...(body.reason !== undefined && { reason: body.reason }),
    ...(body.fromSchool !== undefined && { fromSchool: body.fromSchool }),
    ...(body.toSchool !== undefined && { toSchool: body.toSchool }),
    ...(body.fromClass !== undefined && { fromClass: body.fromClass }),
    ...(body.toClass !== undefined && { toClass: body.toClass }),
    ...(body.suratNumber !== undefined && { suratNumber: body.suratNumber }),
    ...(body.effectiveDate !== undefined && { effectiveDate: body.effectiveDate }),
    ...(body.status && { status: body.status }),
    ...(body.documentUrl !== undefined && { documentUrl: body.documentUrl }),
  };
}

// GET /api/mutations - List mutasi with filters
router.get("/", async (req, res) => {
  try {
    const { type, search, startDate, endDate } = req.query;

    let conditions = [];

    if (type) {
      conditions.push(eq(mutationRecords.type, String(type)));
    }

    if (startDate) {
      conditions.push(gte(mutationRecords.effectiveDate, String(startDate)));
    }

    if (endDate) {
      conditions.push(lte(mutationRecords.effectiveDate, String(endDate)));
    }

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        or(
          ilike(studentProfiles.fullName, q),
          ilike(studentProfiles.nisn, q),
          ilike(studentProfiles.nis, q)
        )
      );
    }

    const records = await db
      .select({
        id: mutationRecords.id,
        studentId: mutationRecords.studentId,
        type: mutationRecords.type,
        reason: mutationRecords.reason,
        fromSchool: mutationRecords.fromSchool,
        toSchool: mutationRecords.toSchool,
        fromClass: mutationRecords.fromClass,
        toClass: mutationRecords.toClass,
        suratNumber: mutationRecords.suratNumber,
        effectiveDate: mutationRecords.effectiveDate,
        status: mutationRecords.status,
        createdAt: mutationRecords.createdAt,
        student: {
          fullName: studentProfiles.fullName,
          nisn: studentProfiles.nisn,
          nis: studentProfiles.nis,
          className: studentProfiles.className,
        },
      })
      .from(mutationRecords)
      .leftJoin(studentProfiles, eq(mutationRecords.studentId, studentProfiles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mutationRecords.effectiveDate));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mutations/stats - Dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    // Total counts
    const counts = await db
      .select({
        type: mutationRecords.type,
        count: sql<number>`count(*)`,
      })
      .from(mutationRecords)
      .groupBy(mutationRecords.type);

    // This month
    const thisMonth = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(mutationRecords)
      .where(gte(mutationRecords.effectiveDate, firstDayOfMonth));

    const result = {
      totalMasuk: counts.find(c => c.type === 'masuk')?.count || 0,
      totalKeluar: counts.find(c => c.type === 'keluar')?.count || 0,
      totalInternal: counts.find(c => c.type === 'internal')?.count || 0,
      totalBulanIni: thisMonth[0]?.count || 0,
    };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mutations/recent - 10 recent activities
router.get("/recent", async (req, res) => {
  try {
    const records = await db
      .select({
        id: mutationRecords.id,
        type: mutationRecords.type,
        effectiveDate: mutationRecords.effectiveDate,
        status: mutationRecords.status,
        student: {
          id: studentProfiles.id,
          fullName: studentProfiles.fullName,
          nisn: studentProfiles.nisn,
        },
      })
      .from(mutationRecords)
      .leftJoin(studentProfiles, eq(mutationRecords.studentId, studentProfiles.id))
      .orderBy(desc(mutationRecords.createdAt))
      .limit(10);

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mutations
router.post("/", async (req, res) => {
  try {
    const data = validateMutationData(req.body);
    const userId = (req as any).user?.id || null; // Assume user is attached to req by auth middleware

    const [record] = await db
      .insert(mutationRecords)
      .values({
        ...data,
        createdBy: userId,
      })
      .returning();

    // Update student status based on mutation type
    if (data.type === 'keluar') {
       await db.update(studentProfiles)
         .set({ status: 'Keluar' })
         .where(eq(studentProfiles.id, data.studentId));
    } else if (data.type === 'masuk') {
       // if it's masuk, and student already created, ensure status is aktif
       await db.update(studentProfiles)
         .set({ status: 'Aktif' })
         .where(eq(studentProfiles.id, data.studentId));
    }

    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/mutations/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = validateMutationData(req.body, true);

    const [record] = await db
      .update(mutationRecords)
      .set({
        ...data,
        updatedAt: sql`now()`,
      })
      .where(eq(mutationRecords.id, id))
      .returning();

    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/mutations/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [record] = await db
      .delete(mutationRecords)
      .where(eq(mutationRecords.id, id))
      .returning();

    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json({ message: "Record deleted", record });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
