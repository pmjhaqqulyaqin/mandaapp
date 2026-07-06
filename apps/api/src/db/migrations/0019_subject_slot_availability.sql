-- Add pembatasan columns to master_subjects
ALTER TABLE master_subjects ADD COLUMN IF NOT EXISTS double_lessons_over_breaks BOOLEAN DEFAULT false;
ALTER TABLE master_subjects ADD COLUMN IF NOT EXISTS can_be_over_lunch BOOLEAN DEFAULT false;
ALTER TABLE master_subjects ADD COLUMN IF NOT EXISTS once_per_day BOOLEAN DEFAULT false;
ALTER TABLE master_subjects ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;

-- Create subject_slot_availability table (Waktu Kosong Mapel)
CREATE TABLE IF NOT EXISTS subject_slot_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES master_subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  jam_ke INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by subject
CREATE INDEX IF NOT EXISTS idx_subject_slot_avail_subject ON subject_slot_availability(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_slot_avail_lookup ON subject_slot_availability(subject_id, day_of_week, jam_ke);
