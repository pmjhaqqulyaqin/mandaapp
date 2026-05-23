import { db } from "../../db";
import { tracerStudies, tracerResponses } from "../../db/schema";
import { eq } from "drizzle-orm";

export class TracerService {
  static async getAllStudies() {
    return db.select().from(tracerStudies);
  }

  static async getStudyById(id: string) {
    const res = await db.select().from(tracerStudies).where(eq(tracerStudies.id, id));
    return res[0] || null;
  }

  static async createStudy(data: any) {
    const res = await db.insert(tracerStudies).values(data).returning();
    return res[0];
  }

  static async updateStudy(id: string, data: any) {
    const res = await db.update(tracerStudies).set(data).where(eq(tracerStudies.id, id)).returning();
    return res[0];
  }

  static async deleteStudy(id: string) {
    const res = await db.delete(tracerStudies).where(eq(tracerStudies.id, id)).returning();
    return res[0];
  }

  static async getResponses(studyId: string) {
    return db.select().from(tracerResponses).where(eq(tracerResponses.studyId, studyId));
  }

  static async submitResponse(data: any) {
    const res = await db.insert(tracerResponses).values(data).returning();
    return res[0];
  }
}
