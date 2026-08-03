import { db } from "./src/db";
import { studentProfiles } from "./src/db/schema";
import { eq, ilike, and, isNull, or } from "drizzle-orm";

async function main() {
  // Find Budi Santoso
  const results = await db.select({ id: studentProfiles.id, fullName: studentProfiles.fullName, nisn: studentProfiles.nisn, nis: studentProfiles.nis })
    .from(studentProfiles)
    .where(ilike(studentProfiles.fullName, '%Budi Santoso%'));
  
  console.log('Found:', JSON.stringify(results, null, 2));

  if (results.length > 0) {
    for (const r of results) {
      await db.delete(studentProfiles).where(eq(studentProfiles.id, r.id));
      console.log(`Deleted: ${r.fullName} (${r.id})`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
