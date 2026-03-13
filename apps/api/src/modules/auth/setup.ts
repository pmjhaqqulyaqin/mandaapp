import { eq } from "drizzle-orm";
import { user as userTable } from "../../db/schema";
import { db as database } from "../../db";
import { auth } from "./index";

import { sql } from "drizzle-orm";

export const setupAdmin = async (req: any, res: any) => {
  console.log('--- SETUP ADMIN TRIGGERED ---');
  try {
    // Check if any user exists using direct DB query to avoid Better Auth permission checks
    const userCountResult = await database.execute(sql`SELECT count(*) as count FROM "user"`);
    const count = parseInt((userCountResult.rows[0] as any).count);
    
    console.log('Total users in DB:', count);

    if (count > 0) {
      console.log('Database is not empty, skipping admin auto-setup.');
      return res.status(400).json({ 
        message: "Database is not empty.", 
        hint: "Admin setup only works on a fresh database. If you need to reset, delete all users first." 
      });
    }

    console.log('Creating admin user via Better Auth API...');
    // We try to call the API. Some environments require headers even for internal calls
    const adminUser = await auth.api.signUpEmail({
      body: {
        email: "admin@mandalotim.id",
        password: "PasswordAdmin123!",
        name: "Administrator",
      },
      // Adding headers might help with UNAUTHORIZED if the secret is needed
      headers: {
        "x-better-auth-secret": process.env.BETTER_AUTH_SECRET || ""
      }
    });

    if (!adminUser) {
        throw new Error("Better Auth returned empty user object");
    }

    console.log('User created, updating role directly in DB...');
    await database.update(userTable)
        .set({ role: "admin" })
        .where(eq(userTable.email, "admin@mandalotim.id"));

    console.log('Setup complete!');
    res.json({ 
      message: "Admin created successfully!", 
      email: "admin@mandalotim.id",
      password: "PasswordAdmin123!",
      status: "success"
    });

  } catch (error: any) {
    console.error("Setup Admin Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    res.status(500).json({ 
      message: "Failed to create admin", 
      error: error.message || "No message",
      code: error.code || error.status || "no_code",
      hint: "Check if BETTER_AUTH_SECRET is set in Railway variables.",
      debug_received_url: process.env.BETTER_AUTH_URL,
      secret_configured: !!process.env.BETTER_AUTH_SECRET
    });
  }
};
