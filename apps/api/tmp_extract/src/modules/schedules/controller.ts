import { Request, Response } from "express";
import { ScheduleService } from "./service";

export class ScheduleController {
  static async getAll(req: Request, res: Response) {
    try {
      const classFilter = req.query.class as string;
      const teacherFilter = req.query.teacher as string;
      const schedules = await ScheduleService.getSchedules(classFilter, teacherFilter);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const schedule = await ScheduleService.createSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create schedule" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const schedule = await ScheduleService.updateSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ScheduleService.deleteSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  }
}
