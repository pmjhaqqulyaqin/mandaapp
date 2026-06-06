import { db } from "../../db";
import { cardPrintHistory } from "../../db/schema";
import { desc, sql } from "drizzle-orm";

export class CardPrintHistoryService {
  static async getHistory(limit = 50) {
    return db
      .select()
      .from(cardPrintHistory)
      .orderBy(desc(cardPrintHistory.printedAt))
      .limit(limit);
  }

  static async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int`, totalCards: sql<number>`coalesce(sum(${cardPrintHistory.studentCount}), 0)::int` })
      .from(cardPrintHistory);

    const [todayResult] = await db
      .select({ count: sql<number>`count(*)::int`, totalCards: sql<number>`coalesce(sum(${cardPrintHistory.studentCount}), 0)::int` })
      .from(cardPrintHistory)
      .where(sql`${cardPrintHistory.printedAt} >= ${today.toISOString()}`);

    return {
      totalPrints: totalResult?.count || 0,
      totalCards: totalResult?.totalCards || 0,
      todayPrints: todayResult?.count || 0,
      todayCards: todayResult?.totalCards || 0,
    };
  }

  static async logPrint(data: {
    printType: string;
    studentCount: number;
    classFilter?: string;
    orientation?: string;
    templateUsed?: string;
    studentNames?: string;
    printedBy?: string;
  }) {
    const [result] = await db
      .insert(cardPrintHistory)
      .values(data)
      .returning();
    return result;
  }
}
