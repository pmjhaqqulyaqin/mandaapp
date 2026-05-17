-- Migration: Add scheduler constraint columns to kbm_subjects + new tables
-- Safe: all operations use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- 1. Add new columns to kbm_subjects
ALTER TABLE "kbm_subjects" ADD COLUMN IF NOT EXISTS "max_jam_ke" integer;
ALTER TABLE "kbm_subjects" ADD COLUMN IF NOT EXISTS "allow_single_split" boolean DEFAULT false;
ALTER TABLE "kbm_subjects" ADD COLUMN IF NOT EXISTS "is_heavy" boolean DEFAULT false;
ALTER TABLE "kbm_subjects" ADD COLUMN IF NOT EXISTS "custom_split_rule" jsonb;

-- 2. Create guru_unavailability table
CREATE TABLE IF NOT EXISTS "guru_unavailability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guru_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" varchar(10) NOT NULL,
	"day_of_week" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- 3. Create schedule_config table
CREATE TABLE IF NOT EXISTS "schedule_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" varchar(10) NOT NULL,
	"max_daily_jp_threshold" integer DEFAULT 20,
	"max_daily_jp_limit" integer DEFAULT 6,
	"afternoon_start_jam" integer DEFAULT 7,
	"afternoon_exclude_friday" boolean DEFAULT true,
	"default_split_rules" jsonb DEFAULT '{"2":[2],"3":[3],"4":[2,2],"5":[3,2],"6":[3,3]}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- 4. Add foreign keys (safe: ignore if already exist)
DO $$ BEGIN
  ALTER TABLE "guru_unavailability" ADD CONSTRAINT "guru_unavailability_guru_id_employees_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guru_unavailability" ADD CONSTRAINT "guru_unavailability_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "schedule_config" ADD CONSTRAINT "schedule_config_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
