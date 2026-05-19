-- Add min_jam_ke column to kbm_subjects (inverse of max_jam_ke)
-- null = no restriction, e.g. 5 = only jam 5+ (afternoon-only subjects)
ALTER TABLE kbm_subjects ADD COLUMN IF NOT EXISTS min_jam_ke integer;
