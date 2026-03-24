import { db } from './src/db';
import { studentProfiles } from './src/db/schema';
import { ilike, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

async function main() {
  console.log('Inserting test data...');
  const nisn = crypto.randomUUID().substring(0, 10);
  await db.insert(studentProfiles).values({
    fullName: 'Test Budi ',
    birthPlace: ' Jakarta ',
    birthDate: '2008-01-01',
    nisn: nisn,
    nis: '987',
    className: 'XA'
  });
  
  console.log('Testing query...');
  const fullName = 'Test Budi';
  const birthPlace = 'Jakarta';
  const birthDate = '2008-01-01';

  try {
    const results = await db.select().from(studentProfiles).where(
      and(
        ilike(studentProfiles.fullName, `%${fullName.trim()}%`),
        ilike(studentProfiles.birthPlace, `%${birthPlace.trim()}%`),
        sql`DATE(${studentProfiles.birthDate}) = DATE(${birthDate})`
      )
    );
    console.log('RESULTS:', results);
  } catch (e) {
    console.error('ERROR:', e);
  }
  process.exit(0);
}
main();
