-- Fix gelar S.PD -> S.Pd (dan M.PD -> M.Pd) di dalam kolom JSONB pengaturan tabel ujians
-- Data nama kepala sekolah/penanda tangan tersimpan di pengaturan -> ttd/distribusiTtd/kartuPeserta

-- 1. Fix di pengaturan -> ttd -> nama
UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{ttd,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'ttd'->>'nama', 'S\.PD\b', 'S.Pd', 'gi'))
)
WHERE pengaturan->'ttd'->>'nama' ~* 'S\.PD';

UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{ttd,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'ttd'->>'nama', 'M\.PD\b', 'M.Pd', 'gi'))
)
WHERE pengaturan->'ttd'->>'nama' ~* 'M\.PD';

-- 2. Fix di pengaturan -> distribusiTtd -> nama
UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{distribusiTtd,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'distribusiTtd'->>'nama', 'S\.PD\b', 'S.Pd', 'gi'))
)
WHERE pengaturan->'distribusiTtd'->>'nama' ~* 'S\.PD';

UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{distribusiTtd,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'distribusiTtd'->>'nama', 'M\.PD\b', 'M.Pd', 'gi'))
)
WHERE pengaturan->'distribusiTtd'->>'nama' ~* 'M\.PD';

-- 3. Fix di pengaturan -> kartuPeserta -> nama
UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{kartuPeserta,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'kartuPeserta'->>'nama', 'S\.PD\b', 'S.Pd', 'gi'))
)
WHERE pengaturan->'kartuPeserta'->>'nama' ~* 'S\.PD';

UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{kartuPeserta,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'kartuPeserta'->>'nama', 'M\.PD\b', 'M.Pd', 'gi'))
)
WHERE pengaturan->'kartuPeserta'->>'nama' ~* 'M\.PD';

-- 4. Fix di pengaturan -> ttdKepsek -> nama (digunakan di berita acara)
UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{ttdKepsek,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'ttdKepsek'->>'nama', 'S\.PD\b', 'S.Pd', 'gi'))
)
WHERE pengaturan->'ttdKepsek'->>'nama' ~* 'S\.PD';

UPDATE ujians
SET pengaturan = jsonb_set(
  pengaturan,
  '{ttdKepsek,nama}',
  to_jsonb(REGEXP_REPLACE(pengaturan->'ttdKepsek'->>'nama', 'M\.PD\b', 'M.Pd', 'gi'))
)
WHERE pengaturan->'ttdKepsek'->>'nama' ~* 'M\.PD';
