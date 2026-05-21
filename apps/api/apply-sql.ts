import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function apply() {
  try {
    console.log("Creating table buku_induk_class_mapels...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "buku_induk_class_mapels" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "class_id" uuid NOT NULL,
        "mapels" jsonb DEFAULT '[]'::jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "buku_induk_class_mapels_class_id_unique" UNIQUE("class_id")
      );
    `);
    
    console.log("Adding foreign key constraint...");
    try {
      await db.execute(sql`
        ALTER TABLE "buku_induk_class_mapels" ADD CONSTRAINT "buku_induk_class_mapels_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
      `);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log("Constraint already exists, skipping...");
      } else {
        throw e;
      }
    }
    console.log("Successfully applied SQL!");
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

apply();
