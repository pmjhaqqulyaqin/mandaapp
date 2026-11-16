-- Migration: Kartu Login Peserta Ujian (CBT credentials)
CREATE TABLE IF NOT EXISTS "exam_login_cards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ujian_id" UUID NOT NULL REFERENCES "ujian"("id") ON DELETE CASCADE,
  "siswa_id" UUID NOT NULL REFERENCES "student_profiles"("id"),
  "ruang_id" UUID REFERENCES "ruang_ujian"("id") ON DELETE SET NULL,
  "username" VARCHAR(30) NOT NULL,
  "password" VARCHAR(20) NOT NULL,
  "nomor_urut" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_exam_login_cards_ujian_id" ON "exam_login_cards"("ujian_id");
CREATE INDEX IF NOT EXISTS "idx_exam_login_cards_ruang_id" ON "exam_login_cards"("ruang_id");
