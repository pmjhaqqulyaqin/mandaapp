ALTER TABLE "ijazah_grades" DROP CONSTRAINT "ijazah_grades_subject_id_master_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "master_subjects" ALTER COLUMN "nama" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "master_subjects" ALTER COLUMN "kelompok" SET DEFAULT 'Umum';--> statement-breakpoint
ALTER TABLE "jadwal_ujian" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "jurnal_entries" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "master_subjects" ADD COLUMN "order_num" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "teaching_subjects" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "ijazah_grades" ADD CONSTRAINT "ijazah_grades_subject_id_ijazah_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."ijazah_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_ujian" ADD CONSTRAINT "jadwal_ujian_subject_id_master_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_entries" ADD CONSTRAINT "jurnal_entries_subject_id_master_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_subjects" ADD CONSTRAINT "teaching_subjects_subject_id_master_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."master_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- CUSTOM DATA MIGRATION: Map existing string names to master_subjects.id
-- We use ILIKE for case insensitive mapping
UPDATE "jadwal_ujian" j SET "subject_id" = m."id" FROM "master_subjects" m WHERE j."mata_pelajaran" ILIKE m."nama";--> statement-breakpoint
UPDATE "jurnal_entries" j SET "subject_id" = m."id" FROM "master_subjects" m WHERE j."subject_name" ILIKE m."nama";--> statement-breakpoint
UPDATE "teaching_subjects" t SET "subject_id" = m."id" FROM "master_subjects" m WHERE t."subject_name" ILIKE m."nama";