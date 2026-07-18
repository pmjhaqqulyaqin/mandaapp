import { eq, desc, sql, ilike, and, or } from 'drizzle-orm';
import { db } from '../../db';
import { downloads } from '../../db/schema';

export const getPublicDownloads = async () => {
  return await db.select()
    .from(downloads)
    .where(eq(downloads.isPublished, true))
    .orderBy(desc(downloads.createdAt));
};

export const getAdminDownloads = async (opts: {
  search?: string;
  fileType?: string;
  page?: number;
  limit?: number;
}) => {
  const { search, fileType, page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  
  const conditions: any[] = [];
  
  if (search) {
    conditions.push(
      or(
        ilike(downloads.title, `%${search}%`),
        ilike(downloads.fileName, `%${search}%`),
        ilike(downloads.description, `%${search}%`)
      )
    );
  }
  
  if (fileType && fileType !== 'all') {
    conditions.push(eq(downloads.fileType, fileType));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const [items, countResult] = await Promise.all([
    db.select()
      .from(downloads)
      .where(whereClause)
      .orderBy(desc(downloads.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(downloads)
      .where(whereClause),
  ]);
  
  return {
    items,
    total: countResult[0]?.count || 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
  };
};

export const getDownloadStats = async () => {
  const result = await db.select({
    totalFiles: sql<number>`count(*)::int`,
    totalDownloads: sql<number>`coalesce(sum(${downloads.downloadCount}), 0)::int`,
    totalSize: sql<number>`coalesce(sum(${downloads.fileSize}), 0)::bigint`,
    publicFiles: sql<number>`count(*) filter (where ${downloads.isPublished} = true)::int`,
    privateFiles: sql<number>`count(*) filter (where ${downloads.isPublished} = false)::int`,
  }).from(downloads);
  
  return result[0];
};

export const createDownload = async (data: typeof downloads.$inferInsert) => {
  const [newDownload] = await db.insert(downloads).values(data).returning();
  return newDownload;
};

export const updateDownload = async (id: string, data: Partial<typeof downloads.$inferInsert>) => {
  const [updated] = await db.update(downloads)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(downloads.id, id))
    .returning();
  return updated;
};

export const deleteDownload = async (id: string) => {
  const [deleted] = await db.delete(downloads).where(eq(downloads.id, id)).returning();
  return deleted;
};

export const getDownloadById = async (id: string) => {
  const [item] = await db.select().from(downloads).where(eq(downloads.id, id));
  return item;
};

export const incrementDownloadCount = async (id: string) => {
  const [updated] = await db.update(downloads)
    .set({ downloadCount: sql`${downloads.downloadCount} + 1` })
    .where(eq(downloads.id, id))
    .returning();
  return updated;
};
