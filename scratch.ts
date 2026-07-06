import { db } from './apps/api/src/db';
import { masterSubjects } from './apps/api/src/db/schema';

async function run() {
  const res = await db.select().from(masterSubjects);
  console.log(res.filter(r => r.nama.toLowerCase().includes('arab')));
  process.exit(0);
}
run();
