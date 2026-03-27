import { db } from "../../db";
import { contactMessages } from "../../db/schema";

export class ContactService {
  static async getMessages() {
    return db.select().from(contactMessages);
  }

  static async submitMessage(data: any) {
    const results = await db.insert(contactMessages).values(data).returning();
    return results[0];
  }
}
