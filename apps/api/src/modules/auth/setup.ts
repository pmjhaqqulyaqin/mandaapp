import { eq } from "drizzle-orm";
import { user as userTable } from "../../db/schema";
import { db as database } from "../../db";
import { auth } from "./index";

export const setupAdmin = async (req: any, res: any) => {
  console.log('--- SETUP ADMIN TRIGGERED ---');
  try {
    // Check if any admin already exists
    const users = await auth.api.listUsers({
        query: { limit: 1 }
    });
    console.log('Users found:', users?.users?.length);

    if (users && users.users.length > 0) {
      console.log('Admin already exists, skipping.');
      return res.status(400).json({ message: "Admin already exists or database is not empty." });
    }

    console.log('Creating admin user...');
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
    console.log('User created, updating role...');

    await database.update(userTable)
        .set({ role: "admin" })
        .where(eq(userTable.email, "admin@mandalotim.id"));

    console.log('Setup complete!');
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
