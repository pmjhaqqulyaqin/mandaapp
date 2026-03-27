import { eq, asc } from 'drizzle-orm';
import { db } from '../../db';
import { menus } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

export const getMenus = async () => {
  return await db.select()
    .from(menus)
    .orderBy(asc(menus.order));
};

export const createMenu = async (data: typeof menus.$inferInsert) => {
  const [newMenu] = await db.insert(menus).values({
    ...data,
    id: data.id || uuidv4(),
  }).returning();
  return newMenu;
};

export const updateMenu = async (id: string, data: Partial<typeof menus.$inferInsert>) => {
  const [updated] = await db.update(menus)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(menus.id, id))
    .returning();
  return updated;
};

export const deleteMenu = async (id: string) => {
  // Option: cascade delete submenus manually if needed, or rely on frontend to handle it
  const [deleted] = await db.delete(menus).where(eq(menus.id, id)).returning();
  return deleted;
};
