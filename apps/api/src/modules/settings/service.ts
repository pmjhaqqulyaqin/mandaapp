import { db } from "../../db";
import { siteSettings } from "../../db/schema";
import { eq } from "drizzle-orm";

export class SettingsService {
  static async getAll() {
    return db.select().from(siteSettings);
  }

  static async getByGroup(group: string) {
    return db.select().from(siteSettings).where(eq(siteSettings.group, group));
  }

  static async upsert(key: string, value: string | null, group: string) {
    // Try update first
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    if (existing.length > 0) {
      const results = await db.update(siteSettings)
        .set({ value, group, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      return results[0];
    }
    // Insert new
    const results = await db.insert(siteSettings)
      .values({ key, value, group, updatedAt: new Date() })
      .returning();
    return results[0];
  }

  static async bulkUpsert(items: { key: string; value: string | null; group: string }[]) {
    const results = [];
    for (const item of items) {
      const result = await this.upsert(item.key, item.value, item.group);
      results.push(result);
    }
    return results;
  }
}
