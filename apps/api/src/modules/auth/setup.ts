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

    // Manually set the role to admin in the database if needed
    // (Better Auth plugins might handle this if configured, but let's be sure)
    await auth.api.updateUser({
        body: {
            email: "admin@mandalotim.id",
            role: "admin"
        }
    });

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
