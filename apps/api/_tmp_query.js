const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:jkSBarLOLBlakBEdabwVWkUUSlVjxeOe@autorack.proxy.rlwy.net:17861/railway',
  ssl: { rejectUnauthorized: false }
});
c.connect().then(async () => {
  const r = await c.query("SELECT id, full_name, nisn, nis FROM student_profiles WHERE full_name ILIKE '%Budi Santoso%'");
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}).catch(e => { console.error(e.message); c.end(); });
