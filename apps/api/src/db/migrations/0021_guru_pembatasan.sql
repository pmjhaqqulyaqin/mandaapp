-- Add pembatasan (scheduling constraint) columns to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS max_gaps_per_week INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS max_teaching_days INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS min_lessons_per_day INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS max_lessons_per_day INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS max_consecutive_lessons INTEGER;
