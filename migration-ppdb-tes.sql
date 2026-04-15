CREATE TABLE IF NOT EXISTS "ppdb_tes_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jalur_id" uuid NOT NULL,
	"nama_tes" varchar(150) NOT NULL,
	"bobot" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true,
	"penguji_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ppdb_nilai_tes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"tes_config_id" uuid NOT NULL,
	"nilai" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "ppdb_nilai_tes" ADD CONSTRAINT "ppdb_nilai_tes_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ppdb_nilai_tes" ADD CONSTRAINT "ppdb_nilai_tes_tes_config_id_ppdb_tes_config_id_fk" FOREIGN KEY ("tes_config_id") REFERENCES "public"."ppdb_tes_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ppdb_tes_config" ADD CONSTRAINT "ppdb_tes_config_jalur_id_ppdb_jalur_id_fk" FOREIGN KEY ("jalur_id") REFERENCES "public"."ppdb_jalur"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ppdb_tes_config" ADD CONSTRAINT "ppdb_tes_config_penguji_id_user_id_fk" FOREIGN KEY ("penguji_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
