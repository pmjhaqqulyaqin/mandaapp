-- Add pembatasan columns to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS lunch_break_start INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS lunch_break_end INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS min_lessons_per_day INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_lessons_per_day INTEGER;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS num_teaching_days INTEGER;

-- Create class_slot_availability table (Waktu Kosong Kelas)
CREATE TABLE IF NOT EXISTS class_slot_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  jam_ke INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by class
CREATE INDEX IF NOT EXISTS idx_class_slot_avail_class ON class_slot_availability(class_id);
CREATE INDEX IF NOT EXISTS idx_class_slot_avail_lookup ON class_slot_availability(class_id, day_of_week, jam_ke);
