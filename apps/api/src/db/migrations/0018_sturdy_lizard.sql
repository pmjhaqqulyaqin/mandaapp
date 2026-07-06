CREATE TABLE "class_slot_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"jam_ke" integer NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guru_slot_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guru_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" varchar(10) NOT NULL,
	"day_of_week" integer NOT NULL,
	"jam_ke" integer NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduling_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"subject_ids" jsonb NOT NULL,
	"class_scope" varchar(20) DEFAULT 'all',
	"class_ids" jsonb,
	"params" jsonb,
	"priority" varchar(20) DEFAULT 'normal',
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subject_slot_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"jam_ke" integer NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "kbm_jadwal" DROP CONSTRAINT "kbm_jadwal_ruangan_id_ruangan_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "lunch_break_start" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "lunch_break_end" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "min_lessons_per_day" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "max_lessons_per_day" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "num_teaching_days" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "max_gaps_per_week" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "max_teaching_days" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "min_lessons_per_day" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "max_lessons_per_day" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "max_consecutive_lessons" integer;--> statement-breakpoint
ALTER TABLE "master_subjects" ADD COLUMN "double_lessons_over_breaks" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "master_subjects" ADD COLUMN "can_be_over_lunch" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "master_subjects" ADD COLUMN "once_per_day" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "master_subjects" ADD COLUMN "is_temporary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "class_slot_availability" ADD CONSTRAINT "class_slot_availability_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guru_slot_availability" ADD CONSTRAINT "guru_slot_availability_guru_id_employees_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guru_slot_availability" ADD CONSTRAINT "guru_slot_availability_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_slot_availability" ADD CONSTRAINT "subject_slot_availability_subject_id_master_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbm_jadwal" ADD CONSTRAINT "kbm_jadwal_ruangan_id_ruangan_id_fk" FOREIGN KEY ("ruangan_id") REFERENCES "public"."ruangan"("id") ON DELETE set null ON UPDATE no action;