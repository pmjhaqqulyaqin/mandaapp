import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "jenis_surats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nama_jenis" varchar(150) NOT NULL,
        "kode_jenis" varchar(50) NOT NULL,
        "format_penomoran" text NOT NULL,
        "butuh_kka" boolean DEFAULT true,
        "butuh_derajat" boolean DEFAULT true,
        "aktif" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "surat_keluars" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "jenis_surat_id" uuid NOT NULL REFERENCES "jenis_surats"("id"),
        "nomor_urut" integer NOT NULL,
        "nomor_lengkap" varchar(255) UNIQUE NOT NULL,
        "derajat_kode" varchar(20),
        "kode_satker" varchar(50),
        "kka_kode" varchar(50),
        "bulan" varchar(2),
        "tahun" varchar(4) NOT NULL,
        "perihal" text NOT NULL,
        "tujuan" varchar(255),
        "tanggal_generate" timestamp DEFAULT now(),
        "user_id_pengambil" text REFERENCES "user"("id")
      );

      CREATE TABLE IF NOT EXISTS "surat_masuk" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nomor_agenda" varchar(50) UNIQUE NOT NULL,
        "nomor_surat_asli" varchar(150) NOT NULL,
        "tanggal_surat" date NOT NULL,
        "tanggal_diterima" timestamp DEFAULT now(),
        "pengirim" varchar(255) NOT NULL,
        "perihal" text NOT NULL,
        "sifat" varchar(50),
        "derajat" varchar(20),
        "user_id_penerima" text REFERENCES "user"("id")
      );
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
