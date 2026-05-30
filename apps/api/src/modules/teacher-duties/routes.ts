import { Router, Request, Response } from 'express';
import { getMasterDutyTypes, createMasterDutyType, updateMasterDutyType, deleteMasterDutyType, getTeacherDuties, createTeacherDuty, updateTeacherDuty, deleteTeacherDuty } from "./controller";

export const teacherDutiesRouter = Router();

// ─── MASTER DUTY TYPES ───

teacherDutiesRouter.get("/master-types", async (req: Request, res: Response) => {
  try {
    const types = await getMasterDutyTypes();
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

teacherDutiesRouter.post("/master-types", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const result = await createMasterDutyType(data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

teacherDutiesRouter.put("/master-types/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const result = await updateMasterDutyType(id, data);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

teacherDutiesRouter.delete("/master-types/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await deleteMasterDutyType(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── TEACHER DUTIES ───

teacherDutiesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const teacherId = req.query.teacherId as string;
    const academicYear = req.query.academicYear as string;
    const duties = await getTeacherDuties({ startDate, endDate, teacherId, academicYear });
    res.json(duties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

teacherDutiesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const result = await createTeacherDuty(data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

teacherDutiesRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const result = await updateTeacherDuty(id, data);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

teacherDutiesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await deleteTeacherDuty(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
