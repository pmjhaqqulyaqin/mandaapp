import { db } from "../../db";
import { galleryImages } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export class GalleryService {
  static async getImages() {
    return db.select().from(galleryImages).orderBy(desc(galleryImages.uploadedAt));
  }

  static async createImage(data: any) {
    const results = await db.insert(galleryImages).values(data).returning();
    return results[0];
  }

  static async deleteImage(id: string) {
    const results = await db.delete(galleryImages).where(eq(galleryImages.id, id)).returning();
    return results[0];
  }

  static async updateImage(id: string, data: any) {
    const results = await db.update(galleryImages).set(data).where(eq(galleryImages.id, id)).returning();
    return results[0];
  }
}
