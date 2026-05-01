CREATE TABLE "ijazah_subject_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"class_ids" jsonb DEFAULT '[]'::jsonb,
	"sem1" boolean DEFAULT false,
	"sem2" boolean DEFAULT false,
	"sem3" boolean DEFAULT false,
	"sem4" boolean DEFAULT false,
	"sem5" boolean DEFAULT false,
	"um" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ijazah_subjects" ADD COLUMN "semester" varchar(20) DEFAULT 'global';--> statement-breakpoint
ALTER TABLE "ijazah_subject_mappings" ADD CONSTRAINT "ijazah_subject_mappings_subject_id_ijazah_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."ijazah_subjects"("id") ON DELETE cascade ON UPDATE no action;