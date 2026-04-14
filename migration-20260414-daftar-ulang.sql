ALTER TABLE "ppdb_config" ADD COLUMN IF NOT EXISTS "batas_daftar_ulang" timestamp;

CREATE TABLE IF NOT EXISTS "ppdb_daftar_ulang" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"bukti_pembayaran_url" varchar(500),
	"ijazah_url" varchar(500),
	"kk_url" varchar(500),
	"kip_url" varchar(500),
	"photo_url" varchar(500),
	"ukuran_baju" varchar(10),
	"ukuran_celana" varchar(50),
	"status" varchar(30) DEFAULT 'menunggu_validasi',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ppdb_daftar_ulang_pendaftar_id_unique" UNIQUE("pendaftar_id")
);

DO $$ BEGIN
 ALTER TABLE "ppdb_daftar_ulang" ADD CONSTRAINT "ppdb_daftar_ulang_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
