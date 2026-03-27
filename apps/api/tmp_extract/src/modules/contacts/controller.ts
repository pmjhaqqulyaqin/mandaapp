import { Request, Response } from "express";
import { ContactService } from "./service";

export class ContactController {
  static async getAll(req: Request, res: Response) {
    try {
      const messages = await ContactService.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contact messages" });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const message = await ContactService.submitMessage(req.body);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit contact message" });
    }
  }
}
