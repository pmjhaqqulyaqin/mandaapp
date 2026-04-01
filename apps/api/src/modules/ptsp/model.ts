import { db } from '../../db';
import { serviceRequests } from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export type InsertServiceRequest = typeof serviceRequests.$inferInsert;
export type SelectServiceRequest = typeof serviceRequests.$inferSelect;

// Generate a random 6-character alphanum ticket ID like MDT-A9B2C3
const generateTicketId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MDT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createServiceRequest = async (data: Omit<InsertServiceRequest, 'id' | 'ticketId' | 'status' | 'createdAt' | 'updatedAt'>) => {
  let ticketId = generateTicketId();
  // Simple while loop to ensure uniqueness
  let exists = await db.select().from(serviceRequests).where(eq(serviceRequests.ticketId, ticketId)).limit(1);
  while (exists.length > 0) {
    ticketId = generateTicketId();
    exists = await db.select().from(serviceRequests).where(eq(serviceRequests.ticketId, ticketId)).limit(1);
  }

  const [inserted] = await db.insert(serviceRequests).values({
    ...data,
    ticketId,
    status: 'pending'
  }).returning();

  return inserted;
};

export const getServiceRequestByTicket = async (ticketId: string) => {
  const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.ticketId, ticketId)).limit(1);
  return request;
};

export const getAllServiceRequests = async (type?: string, status?: string) => {
  let query = db.select().from(serviceRequests).$dynamic();
  
  const conditions = [];
  if (type) conditions.push(eq(serviceRequests.type, type));
  if (status) conditions.push(eq(serviceRequests.status, status));

  if (conditions.length > 0) {
    // Need and() if multiple conditions, but drizzle can take multiple arguments to and()
    query = query.where(and(...conditions));
  }

  return await query.orderBy(desc(serviceRequests.createdAt));
};

export const updateServiceRequestStatus = async (id: string, status: string, adminReply?: string) => {
  const [updated] = await db.update(serviceRequests)
    .set({ 
      status, 
      adminReply: adminReply !== undefined ? adminReply : null,
      updatedAt: new Date()
    })
    .where(eq(serviceRequests.id, id))
    .returning();
  return updated;
};

export const deleteServiceRequest = async (id: string) => {
  const [deleted] = await db.delete(serviceRequests).where(eq(serviceRequests.id, id)).returning();
  return deleted;
};
