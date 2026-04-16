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

  /** Lightweight summary for landing page — excludes heavy `content` field */
  static async getNewsSummary(limit = 6) {
    const rows = await db
      .select({
        id: newsAnnouncements.id,
        title: newsAnnouncements.title,
        content: newsAnnouncements.content,
        publishDate: newsAnnouncements.publishDate,
        status: newsAnnouncements.status,
      })
      .from(newsAnnouncements)
      .where(eq(newsAnnouncements.status, "Published"))
      .orderBy(desc(newsAnnouncements.publishDate))
      .limit(limit);

    // Extract only thumbnail URL and short excerpt from content — never send full HTML
    return rows.map((row) => {
      const imgMatch = row.content?.match(/<img[^>]+src=["']([^"']+)["']/);
      const plainText = row.content?.replace(/<[^>]*>?/gm, "").trim() || "";
      return {
        id: row.id,
        title: row.title,
        publishDate: row.publishDate,
        status: row.status,
        imageUrl: imgMatch ? imgMatch[1] : "",
        excerpt: plainText.substring(0, 200),
      };
    });
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
