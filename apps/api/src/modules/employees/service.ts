import { db } from "../../db";
import { employees } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export class EmployeeService {
  static async getAllEmployees(filters?: { type?: string }) {
    if (filters?.type) {
      return db.select().from(employees).where(eq(employees.type, filters.type));
    }
    return db.select().from(employees);
  }

  static async getEmployeeById(id: string) {
    const results = await db.select().from(employees).where(eq(employees.id, id));
    return results[0] || null;
  }

  static async createEmployee(data: any) {
    const results = await db.insert(employees)
      .values(data)
      .onConflictDoUpdate({
        target: employees.nip,
        set: data
      })
      .returning();
    return results[0];
  }

  static async bulkCreateEmployees(data: any[]) {
    // Avoid dropping existing teachers based on NIP
    const results = await db.insert(employees)
      .values(data)
      .onConflictDoNothing({ target: employees.nip })
      .returning();
    return results;
  }

  static async updateEmployee(id: string, data: any) {
    const results = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return results[0];
  }

  static async deleteEmployee(id: string) {
    const results = await db.delete(employees).where(eq(employees.id, id)).returning();
    return results[0];
  }
}
