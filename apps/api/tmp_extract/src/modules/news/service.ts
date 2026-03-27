import { db } from "../../db";
import { newsAnnouncements } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export class NewsService {
  static async getAllNews(includeDrafts = false) {
    if (includeDrafts) {
      return db.select().from(newsAnnouncements).orderBy(desc(newsAnnouncements.publishDate));
    }
    return db.select().from(newsAnnouncements).where(eq(newsAnnouncements.status, "Published")).orderBy(desc(newsAnnouncements.publishDate));
  }

  static async getNewsById(id: string) {
    const results = await db.select().from(newsAnnouncements).where(eq(newsAnnouncements.id, id));
    return results[0] || null;
  }

  static async createNews(data: any) {
    const results = await db.insert(newsAnnouncements).values(data).returning();
    return results[0];
  }

  static async updateNews(id: string, data: any) {
    const results = await db.update(newsAnnouncements).set(data).where(eq(newsAnnouncements.id, id)).returning();
    return results[0];
  }

  static async deleteNews(id: string) {
    const results = await db.delete(newsAnnouncements).where(eq(newsAnnouncements.id, id)).returning();
    return results[0];
  }
}
