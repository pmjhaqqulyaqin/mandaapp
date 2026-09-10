-- Migration: Create e-Rapor tables (rapor_config, rapor_tp, rapor_nilai)
-- KMA 450/2024 — Formula NA = (Rerata TP × bobot%) + (SAS × bobot%)

-- ═══════════════════════════════════════════════════════════════
-- rapor_config: Konfigurasi Bobot Penilaian per Kelas/Mapel/Semester
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "rapor_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id"),
  "semester" varchar(10) NOT NULL,
  "class_id" uuid REFERENCES "classes"("id"),
  "subject_id" uuid REFERENCES "kbm_subjects"("id"),
  "bobot_tp" integer NOT NULL DEFAULT 60,
  "bobot_sas" integer NOT NULL DEFAULT 40,
  "kktp" integer NOT NULL DEFAULT 75,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- rapor_tp: Tujuan Pembelajaran (TP) Master — Jumlah TP dinamis
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "rapor_tp" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id"),
  "semester" varchar(10) NOT NULL,
  "subject_id" uuid NOT NULL REFERENCES "kbm_subjects"("id"),
  "nomor_tp" integer NOT NULL,
  "judul" varchar(255) NOT NULL,
  "deskripsi" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- rapor_nilai: Nilai Siswa per TP + SAS (JSONB untuk TP dinamis)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "rapor_nilai" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "academic_year_id" uuid NOT NULL REFERENCES "academic_years"("id"),
  "semester" varchar(10) NOT NULL,
  "class_id" uuid NOT NULL REFERENCES "classes"("id"),
  "subject_id" uuid NOT NULL REFERENCES "kbm_subjects"("id"),
  "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
  "guru_id" uuid REFERENCES "employees"("id"),
  "nilai_tp" jsonb,
  "nilai_sas" integer,
  "rerata_tp" varchar(10),
  "nilai_akhir" varchar(10),
  "predikat" varchar(30),
  "catatan_formatif" text,
  "deskripsi_capaian" text,
  "is_locked" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS "idx_rapor_nilai_lookup" ON "rapor_nilai" ("academic_year_id", "semester", "class_id", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_rapor_nilai_student" ON "rapor_nilai" ("student_id");
CREATE INDEX IF NOT EXISTS "idx_rapor_tp_lookup" ON "rapor_tp" ("academic_year_id", "semester", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_rapor_config_lookup" ON "rapor_config" ("academic_year_id", "semester");
