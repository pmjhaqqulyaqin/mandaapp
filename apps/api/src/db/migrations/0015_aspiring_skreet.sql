CREATE TABLE "card_print_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"print_type" varchar(20) DEFAULT 'single' NOT NULL,
	"student_count" integer DEFAULT 1 NOT NULL,
	"class_filter" varchar(100),
	"orientation" varchar(20) DEFAULT 'vertical',
	"template_used" varchar(50) DEFAULT 'classic-blue',
	"student_names" text,
	"printed_by" text,
	"printed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_duty_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"color" varchar(20) DEFAULT '#14b8a6',
	"icon" varchar(20) DEFAULT '📋',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" varchar(20) NOT NULL,
	"nama" varchar(150) NOT NULL,
	"short_name" varchar(50),
	"kelompok" varchar(50) DEFAULT 'Kelompok A (Umum)',
	"is_active" boolean DEFAULT true,
	"max_jam_ke" integer,
	"min_jam_ke" integer,
	"allow_single_split" boolean DEFAULT false,
	"is_heavy" boolean DEFAULT false,
	"custom_split_rule" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "master_subjects_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "mutation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"reason" text,
	"from_school" varchar(255),
	"to_school" varchar(255),
	"from_class" varchar(100),
	"to_class" varchar(100),
	"surat_number" varchar(100),
	"effective_date" date,
	"status" varchar(20) DEFAULT 'aktif',
	"document_url" varchar(500),
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teacher_duties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duty_date" date NOT NULL,
	"teacher_id" uuid NOT NULL,
	"duty_type_id" uuid NOT NULL,
	"notes" text,
	"academic_year" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracer_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"company_or_campus" varchar(255),
	"description" text,
	"payload" jsonb,
	"bukti_url" varchar(500),
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tracer_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"target_year" varchar(4),
	"status" varchar(20) DEFAULT 'Aktif',
	"target_responses" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ijazah_grades" DROP CONSTRAINT "ijazah_grades_subject_id_ijazah_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "is_notable" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "card_print_history" ADD CONSTRAINT "card_print_history_printed_by_user_id_fk" FOREIGN KEY ("printed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_records" ADD CONSTRAINT "mutation_records_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_records" ADD CONSTRAINT "mutation_records_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_duties" ADD CONSTRAINT "teacher_duties_teacher_id_employees_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_duties" ADD CONSTRAINT "teacher_duties_duty_type_id_master_duty_types_id_fk" FOREIGN KEY ("duty_type_id") REFERENCES "public"."master_duty_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracer_responses" ADD CONSTRAINT "tracer_responses_study_id_tracer_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."tracer_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracer_responses" ADD CONSTRAINT "tracer_responses_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ijazah_grades" ADD CONSTRAINT "ijazah_grades_subject_id_master_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE cascade ON UPDATE no action;