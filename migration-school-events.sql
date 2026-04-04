-- Migration: Create school_events table for Calendar Pendidikan
-- Run this on production database before deploying the new code
-- This is safe to run multiple times (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  color VARCHAR(20),
  academic_year VARCHAR(20) NOT NULL,
  created_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries by academic year
CREATE INDEX IF NOT EXISTS idx_school_events_academic_year ON school_events(academic_year);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_school_events_event_date ON school_events(event_date);
