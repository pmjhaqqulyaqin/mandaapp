-- Phase 4: Jadwal Versioning
-- Run this migration to add the version table and column

CREATE TABLE IF NOT EXISTS jadwal_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester VARCHAR(10) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  is_aktif BOOLEAN DEFAULT false,
  total_slots INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  quality_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add version_id column to kbm_jadwal (nullable for backward compat)
ALTER TABLE kbm_jadwal ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES jadwal_version(id) ON DELETE CASCADE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_jadwal_version_active ON jadwal_version(academic_year_id, semester, is_aktif);
CREATE INDEX IF NOT EXISTS idx_kbm_jadwal_version ON kbm_jadwal(version_id);
