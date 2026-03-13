import { db } from "../../db";
import { sql } from "drizzle-orm";

export const checkDatabase = async (req: any, res: any) => {
  console.log('--- DB CHECK TRIGGERED ---');
  try {
    const result = await db.execute(sql`SELECT 1 as connected`);
    
    // Check if tables exist
    let tablesExist = false;
    try {
      await db.execute(sql`SELECT count(*) from "user"`);
      tablesExist = true;
    } catch (e) {
      tablesExist = false;
    }

    console.log('DB Check Result:', result);
    res.json({ 
      status: "connected", 
      tables_ready: tablesExist,
      result,
      database_url_configured: !!process.env.DATABASE_URL,
      database_url_prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.split(':')[0] : 'none'
    });
  } catch (error: any) {
    console.error("DB Check Error:", error);
    res.status(500).json({ 
      status: "error", 
      message: error.message,
      code: error.code,
      hostname: error.hostname,
      database_url_configured: !!process.env.DATABASE_URL
    });
  }
};
