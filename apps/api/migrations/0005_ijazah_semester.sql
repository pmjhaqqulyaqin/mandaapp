-- Migration: Add semester column to ijazah_subjects
-- This enables per-semester subject configuration

-- Add the column with default value
ALTER TABLE ijazah_subjects 
ADD COLUMN IF NOT EXISTS semester VARCHAR(20) NOT NULL DEFAULT 'sem1';

-- Set existing subjects to sem1 as default
UPDATE ijazah_subjects SET semester = 'sem1' WHERE semester IS NULL OR semester = '';

-- Verify
SELECT id, name, semester, is_active FROM ijazah_subjects ORDER BY order_num LIMIT 20;
