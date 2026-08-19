-- Add self-update tracking columns to student_profiles
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "self_update_completed" boolean DEFAULT false;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "self_update_at" timestamp;
