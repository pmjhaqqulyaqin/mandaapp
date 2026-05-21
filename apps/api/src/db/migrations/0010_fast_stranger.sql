CREATE TABLE "education_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"previous_school_name" varchar(255),
	"sttb_date" date,
	"sttb_number" varchar(100),
	"transfer_from_school" varchar(255),
	"transfer_from_class" varchar(50),
	"transfer_accept_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jadwal_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"semester" varchar(10) NOT NULL,
	"nama" varchar(100) NOT NULL,
	"is_aktif" boolean DEFAULT false,
	"total_slots" integer DEFAULT 0,
	"total_failed" integer DEFAULT 0,
	"quality_score" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"relationship" varchar(100),
	"education_level" varchar(100),
	"occupation" varchar(150),
	"phone" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "physical_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"academic_year" varchar(50),
	"height_cm" integer,
	"weight_kg" integer,
	"hearing_condition" varchar(100),
	"vision_condition" varchar(100),
	"dental_condition" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "kbm_jadwal" ADD COLUMN "version_id" uuid;--> statement-breakpoint
ALTER TABLE "kbm_subjects" ADD COLUMN "min_jam_ke" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "nik" varchar(50);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "no_kk" varchar(50);--> statement-breakpoint
ALTER TABLE "education_history" ADD CONSTRAINT "education_history_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_version" ADD CONSTRAINT "jadwal_version_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_profiles" ADD CONSTRAINT "parent_profiles_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_data" ADD CONSTRAINT "physical_data_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbm_jadwal" ADD CONSTRAINT "kbm_jadwal_version_id_jadwal_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."jadwal_version"("id") ON DELETE cascade ON UPDATE no action;