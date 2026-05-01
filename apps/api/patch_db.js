const { Client } = require('pg');

async function run() {
  let success = false;
  let attempts = 0;
  while (!success && attempts < 5) {
    attempts++;
    console.log("Attempt", attempts);
    const client = new Client({
      connectionString: 'postgresql://postgres:jkSBarLOLBlakBEdabwVWkUUSlVjxeOe@autorack.proxy.rlwy.net:17861/railway',
      ssl: { rejectUnauthorized: false }
    });
    
    try {
      await client.connect();
      console.log("Connected to DB.");

      await client.query(`
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
          "updated_at" timestamp DEFAULT now()
        );
      `);
      console.log("Created ijazah_subject_mappings.");
      
      try {
        await client.query(`ALTER TABLE "ijazah_subject_mappings" ADD CONSTRAINT "ijazah_subject_mappings_subject_id_ijazah_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "ijazah_subjects"("id") ON DELETE cascade ON UPDATE no action;`);
        console.log("Added foreign key");
      } catch (e) {
        console.log("FK already exists or error:", e.message);
      }

      try {
        await client.query(`ALTER TABLE "ijazah_subjects" ALTER COLUMN "semester" DROP NOT NULL;`);
        await client.query(`ALTER TABLE "ijazah_subjects" ALTER COLUMN "semester" SET DEFAULT 'global';`);
        console.log("Modified ijazah_subjects.");
      } catch (e) {
        console.log("Col modification error:", e.message);
      }

      console.log("Finished patching db.");
      success = true;
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      await client.end().catch(e => {});
    }
  }
}

run();
