import { db } from "../../db";
import { cardSettings } from "../../db/schema";
import { eq } from "drizzle-orm";

export class CardSettingsService {
  static async getSettings() {
    const results = await db.select().from(cardSettings).limit(1);
    // Return first row or default if empty
    return results[0] || null;
  }

  static async updateSettings(id: string, data: any) {
    if (!id) {
      const results = await db.insert(cardSettings).values(data).returning();
      return results[0];
    }
    const results = await db.update(cardSettings).set(data).where(eq(cardSettings.id, id)).returning();
    return results[0];
  }
}
