import { Request, Response } from "express";
import { EventService } from "./service";

export class EventController {
  static async getAll(req: Request, res: Response) {
    try {
      const academicYear = req.query.academicYear as string;
      if (academicYear) {
        const events = await EventService.getByAcademicYear(academicYear);
        return res.json(events);
      }
      const events = await EventService.getAll();
      res.json(events);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }

  static async getByRange(req: Request, res: Response) {
    try {
      const start = req.query.start as string;
      const end = req.query.end as string;
      if (!start || !end) {
        return res.status(400).json({ error: "start and end query params required" });
      }
      const events = await EventService.getByDateRange(start, end);
      res.json(events);
    } catch (error) {
      console.error("Failed to fetch events by range:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  }

  static async getYears(req: Request, res: Response) {
    try {
      const years = await EventService.getDistinctYears();
      res.json(years);
    } catch (error) {
      console.error("Failed to fetch event years:", error);
      res.status(500).json({ error: "Failed to fetch years" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      // req.authUser is guaranteed by requireStaff middleware
      const event = await EventService.create({
        ...req.body,
        createdBy: req.authUser!.id,
      });
      res.status(201).json(event);
    } catch (error) {
      console.error("Failed to create event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const event = await EventService.update(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Failed to update event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const event = await EventService.delete(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  }
}
