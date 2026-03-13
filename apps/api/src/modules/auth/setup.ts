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
    // Use DB directly to set the role to ensure it works
    try {
      await database.update(userTable)
          .set({ role: "admin" })
          .where(eq(userTable.email, "admin@mandalotim.id"));
    } catch (dbError: any) {
      console.error("Database Update Error (Tables might be missing):", dbError);
      throw new Error(`User created but failed to set role. This usually means the 'user' table is missing. Error: ${dbError.message}`);
    }

  } catch (error: any) {
    console.error("Setup Admin Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Return more descriptive error
    res.status(500).json({ 
      message: "Failed to create admin", 
      error: error.message || "No message",
      code: error.code || error.status || "no_code",
      hint: error.message?.includes('relation "user" does not exist') ? "Database tables are missing." : "Better Auth configuration issue (URL or Secret).",
      debug_received_url: process.env.BETTER_AUTH_URL
    });
  }
};
