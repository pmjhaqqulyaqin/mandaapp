/**
 * Script to clear all student data from the database.
 * Run from VPS: cd /root/mandaapp/apps/api && npx tsx clear-students.ts
 */
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete in order of foreign key dependencies
    const r1 = await client.query("DELETE FROM distribusi_peserta");
    console.log(`distribusi_peserta: ${r1.rowCount} rows deleted`);

    const r2 = await client.query("DELETE FROM nis_records");
    console.log(`nis_records: ${r2.rowCount} rows deleted`);

    const r3 = await client.query("DELETE FROM student_profiles");
    console.log(`student_profiles: ${r3.rowCount} rows deleted`);

    await client.query("COMMIT");
    console.log("\n✅ All student data cleared successfully!");
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("❌ ERROR:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
