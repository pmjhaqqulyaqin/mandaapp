import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log("Connected to DB.");

  try {
    await client.query(`
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

    // Migrate data from kbm_subjects
    const resKbm = await client.query(`
      INSERT INTO "master_subjects" (id, kode, nama, is_active, max_jam_ke, min_jam_ke, allow_single_split, is_heavy, custom_split_rule)
      SELECT id, kode, nama, is_active, max_jam_ke, min_jam_ke, allow_single_split, is_heavy, custom_split_rule
      FROM "kbm_subjects"
      ON CONFLICT (kode) DO NOTHING;
    `);
    console.log(`Migrated ${resKbm.rowCount} rows from kbm_subjects.`);

    // Migrate data from ijazah_subjects (match by name or generate code)
    // First let's get all ijazah_subjects
    const ijazahRes = await client.query(`SELECT * FROM "ijazah_subjects"`);
    let migratedIjazah = 0;
    for (const row of ijazahRes.rows) {
      // check if it exists in master_subjects by name
      const exists = await client.query(`SELECT id FROM "master_subjects" WHERE nama = $1`, [row.name]);
      if (exists.rows.length > 0) {
        // Update short_name and kelompok
        await client.query(`
          UPDATE "master_subjects"
          SET short_name = $1, kelompok = $2
          WHERE id = $3
        `, [row.short_name, row.group, exists.rows[0].id]);
        
        // Update mappings and grades to point to the master_subject id
        await client.query(`UPDATE "ijazah_subject_mappings" SET subject_id = $1 WHERE subject_id = $2`, [exists.rows[0].id, row.id]);
        await client.query(`UPDATE "ijazah_grades" SET subject_id = $1 WHERE subject_id = $2`, [exists.rows[0].id, row.id]);
        
        // delete old subject
        await client.query(`DELETE FROM "ijazah_subjects" WHERE id = $1`, [row.id]);
        migratedIjazah++;
      } else {
        // Insert new master subject
        const randomCode = row.short_name || row.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
        
        // Handle code collision
        let code = randomCode;
        let suffix = 1;
        while (true) {
          const codeExists = await client.query(`SELECT id FROM "master_subjects" WHERE kode = $1`, [code]);
          if (codeExists.rows.length === 0) break;
          code = randomCode + suffix;
          suffix++;
        }
        
        const newIdRes = await client.query(`
          INSERT INTO "master_subjects" (kode, nama, short_name, kelompok, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [code, row.name, row.short_name, row.group, row.is_active]);
        
        const newId = newIdRes.rows[0].id;
        // Update dependencies
        await client.query(`UPDATE "ijazah_subject_mappings" SET subject_id = $1 WHERE subject_id = $2`, [newId, row.id]);
        await client.query(`UPDATE "ijazah_grades" SET subject_id = $1 WHERE subject_id = $2`, [newId, row.id]);
        
        // delete old subject
        await client.query(`DELETE FROM "ijazah_subjects" WHERE id = $1`, [row.id]);
        migratedIjazah++;
      }
    }
    console.log(`Migrated ${migratedIjazah} rows from ijazah_subjects.`);

    // Migrate jurnalMapelCodes (they just have kode and subjectName)
    const jurnalRes = await client.query(`SELECT * FROM "jurnal_mapel_codes"`);
    let migratedJurnal = 0;
    for (const row of jurnalRes.rows) {
      const exists = await client.query(`SELECT id FROM "master_subjects" WHERE kode = $1`, [row.kode]);
      if (exists.rows.length > 0) {
         // Do nothing, already there
      } else {
         await client.query(`
          INSERT INTO "master_subjects" (kode, nama)
          VALUES ($1, $2)
         `, [row.kode, row.subjectName]);
         migratedJurnal++;
      }
      await client.query(`DELETE FROM "jurnal_mapel_codes" WHERE id = $1`, [row.id]);
    }
    console.log(`Migrated ${migratedJurnal} rows from jurnal_mapel_codes.`);

  } catch (err) {
    console.error("Error applying sql:", err);
  } finally {
    await client.end();
  }
}

run();
