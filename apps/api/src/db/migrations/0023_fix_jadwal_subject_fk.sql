-- Fix kbm_jadwal.subject_id FK: was pointing to kbm_subjects, should point to master_subjects
-- This caused "violates foreign key constraint kbm_jadwal_subject_id_fkey" on import

-- Step 1: Drop the old FK constraint pointing to kbm_subjects
ALTER TABLE "kbm_jadwal" DROP CONSTRAINT IF EXISTS "kbm_jadwal_subject_id_fkey";
ALTER TABLE "kbm_jadwal" DROP CONSTRAINT IF EXISTS "kbm_jadwal_subject_id_kbm_subjects_id_fk";

-- Step 2: Add the correct FK constraint pointing to master_subjects
ALTER TABLE "kbm_jadwal" ADD CONSTRAINT "kbm_jadwal_subject_id_master_subjects_id_fk"
  FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE no action ON UPDATE no action;
