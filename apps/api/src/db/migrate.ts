import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

const runMigration = async () => {
  console.log("[MIGRATE] Running raw Drizzle ORM migration...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/mandaapp_dev",
    max: 1 // only one connection is needed for migration
  });

  const db = drizzle(pool);

  try {
    // Depending on whether we run via ts-node in src or node in dist
    const isCompiled = __dirname.includes('dist');
    const migrationsFolder = isCompiled 
      ? path.join(__dirname, "../../src/db/migrations") 
      : path.join(__dirname, "migrations");
      
    console.log(`[MIGRATE] Reading migrations from: ${migrationsFolder}`);
    
    await migrate(db, { migrationsFolder });
    console.log("[MIGRATE] Migration successful!");
  } catch (error) {
    console.error("[MIGRATE] Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();
