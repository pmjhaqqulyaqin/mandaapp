CREATE TABLE "downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"file_type" varchar(20) DEFAULT 'pdf' NOT NULL,
	"category" varchar(50) DEFAULT 'pdf_documents' NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"api_key" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "integration_apps_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "popup_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(30) DEFAULT 'image' NOT NULL,
	"image_url" text,
	"link_url" text,
	"link_label" varchar(100),
	"is_active" boolean DEFAULT true,
	"start_date" timestamp,
	"end_date" timestamp,
	"priority" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "kbm_jadwal" DROP CONSTRAINT "kbm_jadwal_subject_id_kbm_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_apps" ADD CONSTRAINT "integration_apps_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kbm_jadwal" ADD CONSTRAINT "kbm_jadwal_subject_id_master_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE no action ON UPDATE no action;