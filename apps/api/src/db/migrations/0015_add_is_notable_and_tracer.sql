-- Migration: Add is_notable and tracer study tables

ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "is_notable" BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS "tracer_studies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "target_year" VARCHAR(4),
  "status" VARCHAR(20) DEFAULT 'Aktif',
  "target_responses" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tracer_responses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "study_id" UUID NOT NULL REFERENCES "tracer_studies"("id") ON DELETE CASCADE,
  "student_id" UUID NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
  "status" VARCHAR(50) NOT NULL,
  "company_or_campus" VARCHAR(255),
  "description" TEXT,
  "payload" JSONB,
  "bukti_url" VARCHAR(500),
  "is_verified" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT now()
);
