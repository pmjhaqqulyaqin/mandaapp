-- Migration: Add kode_label column to penugasan_pengawas
-- Date: 2026-04-11
-- Description: The kode_label column was defined in the Drizzle schema but missing from the original migration SQL.
--              This column stores the proctor label code (e.g., "1", "2" for Group I or "A", "B" for Group II).

ALTER TABLE penugasan_pengawas ADD COLUMN IF NOT EXISTS kode_label VARCHAR(10);

-- Also add pengaturan column to ujian if not exists (safety check)
ALTER TABLE ujian ADD COLUMN IF NOT EXISTS pengaturan JSONB DEFAULT '{}';
