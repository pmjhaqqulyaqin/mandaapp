CREATE TABLE "buku_induk_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"academic_year" varchar(20),
	"class_level" varchar(50),
	"sick" integer DEFAULT 0,
	"excused" integer DEFAULT 0,
	"unexcused" integer DEFAULT 0,
	"promotion_status" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buku_induk_extracurriculars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"activity_name" varchar(200) NOT NULL,
	"semester" integer NOT NULL,
	"academic_year" varchar(20),
	"class_level" varchar(50),
	"predicate" varchar(50),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buku_induk_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_name" varchar(150) NOT NULL,
	"semester" integer NOT NULL,
	"academic_year" varchar(20),
	"class_level" varchar(50),
	"score" varchar(10),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buku_induk_p5" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"fase" varchar(10) NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"dimension" varchar(200),
	"predicate" varchar(50),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "buku_induk_attendance" ADD CONSTRAINT "buku_induk_attendance_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buku_induk_extracurriculars" ADD CONSTRAINT "buku_induk_extracurriculars_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buku_induk_grades" ADD CONSTRAINT "buku_induk_grades_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buku_induk_p5" ADD CONSTRAINT "buku_induk_p5_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;