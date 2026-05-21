CREATE TABLE "buku_induk_final_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"status_type" varchar(50) NOT NULL,
	"graduation_year" varchar(20),
	"ijazah_number" varchar(150),
	"continue_to" varchar(255),
	"leave_class" varchar(50),
	"destination_school" varchar(255),
	"destination_class" varchar(50),
	"leave_reason" text,
	"leave_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "buku_induk_final_status_ijazah_number_unique" UNIQUE("ijazah_number")
);
--> statement-breakpoint
ALTER TABLE "buku_induk_final_status" ADD CONSTRAINT "buku_induk_final_status_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;