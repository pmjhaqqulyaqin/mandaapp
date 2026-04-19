-- NIS Management Migration
-- Run this SQL against the production database

-- 1. Academic Years table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun_ajaran VARCHAR(20) UNIQUE NOT NULL,
  kode_tahun VARCHAR(4) NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_nis_sequence INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. NIS Batches log table
CREATE TABLE IF NOT EXISTS nis_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  jumlah_siswa INTEGER NOT NULL,
  start_sequence INTEGER NOT NULL,
  end_sequence INTEGER NOT NULL,
  operator TEXT REFERENCES "user"(id),
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. NIS Activity Logs table
CREATE TABLE IF NOT EXISTS nis_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  details TEXT,
  student_id UUID REFERENCES student_profiles(id),
  nis_value VARCHAR(50),
  user_id TEXT REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_nis_activity_logs_created_at ON nis_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nis_batches_academic_year ON nis_batches(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active) WHERE is_active = true;
