-- Guru Slot Availability (per hari × jam)
-- Menggantikan guru_unavailability yang hanya per-hari
-- Status: 'available' (✅), 'conditional' (❓), 'unavailable' (❌)

CREATE TABLE IF NOT EXISTS guru_slot_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester VARCHAR(10) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  jam_ke INTEGER NOT NULL CHECK (jam_ke BETWEEN 1 AND 14),
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'conditional', 'unavailable')),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guru_id, academic_year_id, semester, day_of_week, jam_ke)
);

-- Index for fast lookups by guru + semester
CREATE INDEX IF NOT EXISTS idx_guru_slot_avail_guru_sem
  ON guru_slot_availability(guru_id, academic_year_id, semester);

-- Index for scheduler bulk load
CREATE INDEX IF NOT EXISTS idx_guru_slot_avail_sem_status
  ON guru_slot_availability(academic_year_id, semester, status);
