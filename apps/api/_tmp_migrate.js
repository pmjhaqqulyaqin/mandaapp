const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:jkSBarLOLBlakBEdabwVWkUUSlVjxeOe@autorack.proxy.rlwy.net:17861/railway',
  ssl: { rejectUnauthorized: false }
});
c.connect().then(async () => {
  await c.query('ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "self_update_completed" boolean DEFAULT false');
  console.log('Added self_update_completed column');
  await c.query('ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "self_update_at" timestamp');
  console.log('Added self_update_at column');
  await c.end();
  console.log('Migration complete!');
}).catch(e => { console.error(e.message); c.end(); });
