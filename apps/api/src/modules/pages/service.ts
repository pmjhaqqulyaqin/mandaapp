import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { pages } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

export const getPages = async () => {
  return await db.select().from(pages);
};

export const getPageBySlug = async (slug: string) => {
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
  return page;
};

export const createPage = async (data: typeof pages.$inferInsert) => {
  const [newPage] = await db.insert(pages).values({
    ...data,
    id: data.id || uuidv4(),
  }).returning();
  return newPage;
};

export const updatePage = async (id: string, data: Partial<typeof pages.$inferInsert>) => {
  const [updated] = await db.update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pages.id, id))
    .returning();
  return updated;
};

export const deletePage = async (id: string) => {
  const [deleted] = await db.delete(pages).where(eq(pages.id, id)).returning();
  return deleted;
};
