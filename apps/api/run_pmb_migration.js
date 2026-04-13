const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/mandaapp_dev",
    ssl: process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined
  });

  try {
    const sqlPath = path.join(__dirname, '../../migration-ppdb.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Applying PPDB migrations...");
    await pool.query(sql);
    console.log("Migrations applied successfully!");
    
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
};

run();
