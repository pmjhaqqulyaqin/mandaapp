import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Creating exam_login_cards table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "exam_login_cards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ujian_id" uuid NOT NULL REFERENCES "ujian"("id") ON DELETE cascade,
        "siswa_id" uuid NOT NULL REFERENCES "student_profiles"("id"),
        "ruang_id" uuid REFERENCES "ruang_ujian"("id") ON DELETE set null,
        "username" varchar(30) NOT NULL,
        "password" varchar(20) NOT NULL,
        "nomor_urut" integer NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);

    console.log("Creating indexes for exam_login_cards...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_exam_login_cards_ujian_id" ON "exam_login_cards"("ujian_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_exam_login_cards_ruang_id" ON "exam_login_cards"("ruang_id");
    `);

    console.log("Migration for exam_login_cards completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
