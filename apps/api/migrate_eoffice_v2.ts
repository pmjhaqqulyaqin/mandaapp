import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Add file_url to existing tables to support document physical scan uplods
    await client.query(`ALTER TABLE "surat_keluars" ADD COLUMN IF NOT EXISTS "file_url" varchar;`);
    await client.query(`ALTER TABLE "surat_masuk" ADD COLUMN IF NOT EXISTS "file_url" varchar;`);

    // 2. Create Master KKA table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "master_kka" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "kode" varchar(50) UNIQUE NOT NULL,
        "keterangan" varchar(255) NOT NULL,
        "aktif" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // Optionally seed some default KKA codes based on KMA 9/2016
    await client.query(`
      INSERT INTO "master_kka" (kode, keterangan)
      VALUES 
        ('KP.01', 'Penerimaan Pegawai'),
        ('KP.07.1', 'Cuti PNS'),
        ('HM.00', 'Hubungan Masyarakat Umum'),
        ('PP.00', 'Pendidikan dan Pengajaran')
      ON CONFLICT DO NOTHING;
    `);

    console.log("Migration EOffice V2 successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
