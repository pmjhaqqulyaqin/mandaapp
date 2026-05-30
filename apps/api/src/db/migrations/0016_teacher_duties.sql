CREATE TABLE IF NOT EXISTS "master_duty_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"color" varchar(20) DEFAULT '#14b8a6',
	"icon" varchar(20) DEFAULT '📋',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "teacher_duties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duty_date" date NOT NULL,
	"teacher_id" uuid NOT NULL,
	"duty_type_id" uuid NOT NULL,
	"notes" text,
	"academic_year" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "teacher_duties" ADD CONSTRAINT "teacher_duties_teacher_id_employees_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teacher_duties" ADD CONSTRAINT "teacher_duties_duty_type_id_master_duty_types_id_fk" FOREIGN KEY ("duty_type_id") REFERENCES "public"."master_duty_types"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
