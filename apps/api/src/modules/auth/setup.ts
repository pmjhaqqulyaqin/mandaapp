import { eq } from "drizzle-orm";
import { user as userTable } from "../../db/schema";
import { db as database } from "../../db";
import { auth } from "./index";

export const setupAdmin = async (req: any, res: any) => {
  try {
    // Check if any admin already exists to prevent multiple admins
    const users = await auth.api.listUsers({
        query: {
            limit: 1
        }
    });

    if (users && users.users.length > 0) {
      return res.status(400).json({ message: "Admin already exists or database is not empty." });
    }

    // Create the admin user using Better Auth API
    const adminUser = await auth.api.signUpEmail({
      body: {
        email: "admin@mandalotim.id",
        password: "PasswordAdmin123!",
        name: "Administrator",
      },
    });

    if (!adminUser) {
        throw new Error("Failed to create user object");
    }

    // Use DB directly to set the role to ensure it works
    await database.update(userTable)
        .set({ role: "admin" })
        .where(eq(userTable.email, "admin@mandalotim.id"));

    res.json({ 
      message: "Admin created successfully!", 
      email: "admin@mandalotim.id",
      password: "PasswordAdmin123!" 
    });
  } catch (error: any) {
    console.error("Setup Admin Error:", error);
    res.status(500).json({ message: "Failed to create admin", error: error.message });
  }
};
