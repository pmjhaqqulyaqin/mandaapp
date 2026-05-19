-- Fix gelar S.PD -> S.Pd (dan variasi lainnya) di seluruh data pegawai
-- Mencakup semua variasi case: S.PD, S.Pd., S.pd, s.pd, S.PD., dll.

-- 1. Fix di kolom name (employees) - case-insensitive replace semua variasi
UPDATE employees SET name = REGEXP_REPLACE(name, 'S\.PD\b', 'S.Pd', 'gi') WHERE name ~* 'S\.PD';
UPDATE employees SET name = REGEXP_REPLACE(name, 'S\.Pd\.', 'S.Pd.', 'gi') WHERE name ~* 'S\.Pd\.';

-- 2. Fix di kolom rank/pangkat (jika ada gelar)
UPDATE employees SET rank = REGEXP_REPLACE(rank, 'S\.PD\b', 'S.Pd', 'gi') WHERE rank ~* 'S\.PD';

-- 3. Fix di kolom position/jabatan (jika ada gelar)
UPDATE employees SET position = REGEXP_REPLACE(position, 'S\.PD\b', 'S.Pd', 'gi') WHERE position ~* 'S\.PD';

-- 4. Fix di settings (untuk nama kepala sekolah, dsb)
UPDATE settings SET value = REGEXP_REPLACE(value, 'S\.PD\b', 'S.Pd', 'gi') WHERE value ~* 'S\.PD';

-- 5. Fix juga M.PD -> M.Pd
UPDATE employees SET name = REGEXP_REPLACE(name, 'M\.PD\b', 'M.Pd', 'gi') WHERE name ~* 'M\.PD';
UPDATE employees SET rank = REGEXP_REPLACE(rank, 'M\.PD\b', 'M.Pd', 'gi') WHERE rank ~* 'M\.PD';
UPDATE employees SET position = REGEXP_REPLACE(position, 'M\.PD\b', 'M.Pd', 'gi') WHERE position ~* 'M\.PD';
UPDATE settings SET value = REGEXP_REPLACE(value, 'M\.PD\b', 'M.Pd', 'gi') WHERE value ~* 'M\.PD';

-- 6. Fix M.Pd.I (jika ada yang salah tulis M.PD.I)
UPDATE employees SET name = REGEXP_REPLACE(name, 'M\.PD\.I\b', 'M.Pd.I', 'gi') WHERE name ~* 'M\.PD\.I';
UPDATE settings SET value = REGEXP_REPLACE(value, 'M\.PD\.I\b', 'M.Pd.I', 'gi') WHERE value ~* 'M\.PD\.I';
