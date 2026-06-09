import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT 1`);
    console.log(res);
  } catch (err) {
    console.error("Error applying sql:", err);
  } finally {
    process.exit(0);
  }
}
run();
