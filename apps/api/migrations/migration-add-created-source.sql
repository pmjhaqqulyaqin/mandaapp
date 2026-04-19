-- Add created_source column to student_profiles to separate NIS Module originated students
ALTER TABLE "student_profiles" ADD COLUMN "created_source" varchar(50) DEFAULT 'student_module';
