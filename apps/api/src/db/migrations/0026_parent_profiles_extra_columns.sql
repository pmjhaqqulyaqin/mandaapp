-- Add missing columns to parent_profiles for Buku Induk parent data
-- These columns are used by the frontend form but were missing from the table
ALTER TABLE "parent_profiles" ADD COLUMN IF NOT EXISTS "birth_place" varchar(100);
ALTER TABLE "parent_profiles" ADD COLUMN IF NOT EXISTS "birth_date" date;
ALTER TABLE "parent_profiles" ADD COLUMN IF NOT EXISTS "pendidikan" varchar(100);
ALTER TABLE "parent_profiles" ADD COLUMN IF NOT EXISTS "pekerjaan" varchar(150);
ALTER TABLE "parent_profiles" ADD COLUMN IF NOT EXISTS "address" text;
