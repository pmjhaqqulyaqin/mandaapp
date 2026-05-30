import { Hono } from "hono";
import { getMasterDutyTypes, createMasterDutyType, updateMasterDutyType, deleteMasterDutyType, getTeacherDuties, createTeacherDuty, updateTeacherDuty, deleteTeacherDuty } from "./controller";

export const teacherDutiesRouter = new Hono();

// ─── MASTER DUTY TYPES ───

teacherDutiesRouter.get("/master-types", async (c) => {
  try {
    const types = await getMasterDutyTypes();
    return c.json(types);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teacherDutiesRouter.post("/master-types", async (c) => {
  try {
    const data = await c.req.json();
    const result = await createMasterDutyType(data);
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teacherDutiesRouter.put("/master-types/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const result = await updateMasterDutyType(id, data);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teacherDutiesRouter.delete("/master-types/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await deleteMasterDutyType(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── TEACHER DUTIES ───

teacherDutiesRouter.get("/", async (c) => {
  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const teacherId = c.req.query("teacherId");
    const academicYear = c.req.query("academicYear");
    const duties = await getTeacherDuties({ startDate, endDate, teacherId, academicYear });
    return c.json(duties);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teacherDutiesRouter.post("/", async (c) => {
  try {
    const data = await c.req.json();
    const result = await createTeacherDuty(data);
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teacherDutiesRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    const result = await updateTeacherDuty(id, data);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

teacherDutiesRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await deleteTeacherDuty(id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
