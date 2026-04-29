ALTER TABLE "majors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "majors" CASCADE;--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_major_id_majors_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" DROP COLUMN "major_id";