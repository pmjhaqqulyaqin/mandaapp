CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid,
	"date" date NOT NULL,
	"check_in" time,
	"check_out" time,
	"status" varchar(20) NOT NULL,
	"method" varchar(20) DEFAULT 'manual',
	"note" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid,
	"check_in_time" time NOT NULL,
	"late_time" time NOT NULL,
	"check_out_time" time NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ijazah_export_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"selections" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ijazah_export_selections_class_id_unique" UNIQUE("class_id")
);
--> statement-breakpoint
CREATE TABLE "jurnal_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurnal_entry_id" uuid NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_name" varchar(255),
	"file_size" integer,
	"caption" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurnal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teaching_subject_id" uuid,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_name" varchar(150) NOT NULL,
	"date" date NOT NULL,
	"jam_ke" varchar(20),
	"waktu_mulai" time,
	"waktu_selesai" time,
	"link_rpp" text,
	"materi_pembelajaran" text,
	"metode" varchar(255),
	"capaian_pembelajaran" text,
	"kendala_dan_solusi" text,
	"catatan" text,
	"evaluasi" text,
	"jumlah_hadir" integer DEFAULT 0,
	"jumlah_izin" integer DEFAULT 0,
	"jumlah_sakit" integer DEFAULT 0,
	"jumlah_alpa" integer DEFAULT 0,
	"total_siswa" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurnal_mapel_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" varchar(10) NOT NULL,
	"subject_name" varchar(150) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "jurnal_mapel_codes_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "jurnal_student_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurnal_entry_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurnal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"subject_name" varchar(150) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jurnal_time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_of_week" integer NOT NULL,
	"jam_ke" integer NOT NULL,
	"waktu_mulai" time NOT NULL,
	"waktu_selesai" time NOT NULL,
	"label" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parent_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"relation" varchar(20) DEFAULT 'wali',
	"phone" varchar(50),
	"notification_email" boolean DEFAULT true,
	"notification_wa" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teaching_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teaching_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "teaching_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_name" varchar(150) NOT NULL,
	"day_of_week" integer NOT NULL,
	"jam_ke" varchar(20),
	"waktu_mulai" time,
	"waktu_selesai" time,
	"semester" varchar(10) DEFAULT 'ganjil',
	"tahun_ajaran" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "kode_guru" varchar(10);--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ijazah_export_selections" ADD CONSTRAINT "ijazah_export_selections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_attachments" ADD CONSTRAINT "jurnal_attachments_jurnal_entry_id_jurnal_entries_id_fk" FOREIGN KEY ("jurnal_entry_id") REFERENCES "public"."jurnal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_entries" ADD CONSTRAINT "jurnal_entries_teaching_subject_id_teaching_subjects_id_fk" FOREIGN KEY ("teaching_subject_id") REFERENCES "public"."teaching_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_entries" ADD CONSTRAINT "jurnal_entries_teacher_id_employees_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_entries" ADD CONSTRAINT "jurnal_entries_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_entries" ADD CONSTRAINT "jurnal_entries_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_student_attendance" ADD CONSTRAINT "jurnal_student_attendance_jurnal_entry_id_jurnal_entries_id_fk" FOREIGN KEY ("jurnal_entry_id") REFERENCES "public"."jurnal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_student_attendance" ADD CONSTRAINT "jurnal_student_attendance_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_templates" ADD CONSTRAINT "jurnal_templates_teacher_id_employees_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_methods" ADD CONSTRAINT "teaching_methods_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_subjects" ADD CONSTRAINT "teaching_subjects_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_subjects" ADD CONSTRAINT "teaching_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;