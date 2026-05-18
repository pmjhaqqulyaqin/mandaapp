import { db } from "../../db";
import { employees, user as userTable } from "../../db/schema";
import { eq, sql, ilike, and, isNull, ne } from "drizzle-orm";

/** Strip all non-alphanumeric chars for flexible NIP matching */
function normalizeNip(nip: string | null | undefined): string {
  if (!nip) return '';
  return nip.replace(/[^a-zA-Z0-9]/g, '').trim();
}

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

  /** Find employee by NIP — tries exact match first, then normalized (stripped) match */
  static async findByNip(nip: string) {
    const trimmed = nip.trim();
    if (!trimmed) return null;

    // 1. Exact match
    const exact = await db.select().from(employees).where(eq(employees.nip, trimmed)).limit(1);
    if (exact.length > 0) return exact[0];

    // 2. Normalized match (strip dashes, spaces, dots)
    const normalized = normalizeNip(trimmed);
    if (!normalized) return null;
    const all = await db.select().from(employees);
    const found = all.find(e => normalizeNip(e.nip) === normalized);
    return found || null;
  }

  /**
   * Link a user account to an employee record via NIP.
   * Validates:
   * - Employee with that NIP exists
   * - Employee is not already linked to a DIFFERENT user
   * Returns the updated employee or throws an error.
   */
  static async linkUserToEmployee(nip: string, userId: string) {
    const employee = await this.findByNip(nip);
    if (!employee) {
      throw new Error("NIP_NOT_FOUND");
    }

    // Check if already linked to a different user
    if (employee.userId && employee.userId !== userId) {
      throw new Error("NIP_ALREADY_LINKED");
    }

    // Already linked to this user — no-op
    if (employee.userId === userId) {
      return employee;
    }

    // Link it
    const results = await db.update(employees)
      .set({ userId, updatedAt: new Date() })
      .where(eq(employees.id, employee.id))
      .returning();

    // Sync: if employee has a photo, also set it as user avatar
    if (employee.photoUrl) {
      await this.updateUserImage(userId, employee.photoUrl);
    }

    return results[0];
  }

  /** Update employee photo URL */
  static async updatePhoto(employeeId: string, photoUrl: string) {
    const results = await db.update(employees)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(employees.id, employeeId))
      .returning();
    return results[0] || null;
  }

  /** Update user.image (better-auth user table) */
  static async updateUserImage(userId: string, imageUrl: string) {
    await db.update(userTable)
      .set({ image: imageUrl, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  }

  /**
   * Resolve the employee record for a logged-in user.
   * 1. Try exact match on employees.userId
   * 2. Fallback: match by name (case-insensitive)
   * 3. If found by name, auto-link userId so future lookups are instant
   */
  static async resolveEmployeeForUser(userId: string, userName: string, userEmail: string) {
    // 1. Exact match by userId
    const byUserId = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
    if (byUserId.length > 0) return byUserId[0];

    // 2. Fallback: match by name (case-insensitive, trimmed)
    const allEmps = await db.select().from(employees);
    const normalizedUserName = userName?.trim().toLowerCase() || '';
    
    let matched = allEmps.find(e => 
      e.name?.trim().toLowerCase() === normalizedUserName
    );

    // 3. If still not found, try partial name match (e.g. "Muhammad Yusri" matches "Muh. Yusri")
    if (!matched && normalizedUserName) {
      const nameParts = normalizedUserName.split(/\s+/);
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        matched = allEmps.find(e => {
          const empName = e.name?.trim().toLowerCase() || '';
          return empName.includes(lastName) && (
            empName.includes(nameParts[0]) || nameParts[0].includes(empName.split(/\s+/)[0])
          );
        });
      }
    }

    // Auto-link if found
    if (matched) {
      await db.update(employees)
        .set({ userId, updatedAt: new Date() })
        .where(eq(employees.id, matched.id));
      return { ...matched, userId };
    }

    return null;
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
