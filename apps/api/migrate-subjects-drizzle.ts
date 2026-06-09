import { db } from './src/db/index';
import { sql } from 'drizzle-orm';
import * as schema from './src/db/schema';

async function run() {
  console.log("Connected to DB via Drizzle.");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "master_subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "kode" varchar(20) NOT NULL UNIQUE,
        "nama" varchar(150) NOT NULL,
        "short_name" varchar(50),
        "kelompok" varchar(50) DEFAULT 'Kelompok A (Umum)',
        "is_active" boolean DEFAULT true,
        "max_jam_ke" integer,
        "min_jam_ke" integer,
        "allow_single_split" boolean DEFAULT false,
        "is_heavy" boolean DEFAULT false,
        "custom_split_rule" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    console.log("Table master_subjects created.");

    // Migrate from kbm_subjects
    await db.execute(sql`
      INSERT INTO "master_subjects" (id, kode, nama, is_active, max_jam_ke, min_jam_ke, allow_single_split, is_heavy, custom_split_rule)
      SELECT id, kode, nama, is_active, max_jam_ke, min_jam_ke, allow_single_split, is_heavy, custom_split_rule
      FROM "kbm_subjects"
      ON CONFLICT (kode) DO NOTHING;
    `);
    console.log("Migrated kbm_subjects");

    // We will do ijazah manually if needed, but let's just create the table first.
  } catch (err) {
    console.error("Error applying sql:", err);
  } finally {
    process.exit(0);
  }
}

run();
