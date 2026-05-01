import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Creating ijazah_subject_mappings table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ijazah_subject_mappings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "subject_id" uuid NOT NULL,
        "class_ids" jsonb DEFAULT '[]'::jsonb,
        "sem1" boolean DEFAULT false,
        "sem2" boolean DEFAULT false,
        "sem3" boolean DEFAULT false,
        "sem4" boolean DEFAULT false,
        "sem5" boolean DEFAULT false,
        "um" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "ijazah_subject_mappings_subject_id_ijazah_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "ijazah_subjects"("id") ON DELETE cascade ON UPDATE no action
      );
    `);
    
    console.log("Altering ijazah_subjects.semester...");
    await db.execute(sql`ALTER TABLE "ijazah_subjects" ALTER COLUMN "semester" DROP NOT NULL;`);
    await db.execute(sql`ALTER TABLE "ijazah_subjects" ALTER COLUMN "semester" SET DEFAULT 'global';`);

    console.log("Migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
