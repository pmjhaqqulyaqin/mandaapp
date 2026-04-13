-- Migration: PMB / SIMPMB (Penerimaan Murid Baru)
-- Created: 2026-04-13

-- 1. Config table
CREATE TABLE IF NOT EXISTS ppdb_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun_ajaran VARCHAR(20) NOT NULL,
  nama_sistem VARCHAR(100) DEFAULT 'SIMPMB 2026',
  is_active BOOLEAN DEFAULT true,
  tanggal_pengumuman TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Jalur table
CREATE TABLE IF NOT EXISTS ppdb_jalur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES ppdb_config(id) ON DELETE CASCADE,
  nama_jalur VARCHAR(50) NOT NULL,
  kuota INTEGER NOT NULL DEFAULT 0,
  nilai_minimum INTEGER NOT NULL DEFAULT 70,
  requires_prestasi BOOLEAN DEFAULT false,
  jadwal_buka TIMESTAMP,
  jadwal_tutup TIMESTAMP,
  persyaratan TEXT,
  deskripsi TEXT,
  bobot_nilai INTEGER DEFAULT 100,
  bobot_prestasi INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Pendaftar table
CREATE TABLE IF NOT EXISTS ppdb_pendaftar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jalur_id UUID NOT NULL REFERENCES ppdb_jalur(id),
  no_pendaftaran VARCHAR(50) UNIQUE NOT NULL,
  nisn VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(30) DEFAULT 'menunggu',
  catatan_admin TEXT,
  nilai_akhir VARCHAR(10),
  ranking INTEGER,
  tgl_daftar TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Data Diri table
CREATE TABLE IF NOT EXISTS ppdb_data_diri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendaftar_id UUID NOT NULL REFERENCES ppdb_pendaftar(id) ON DELETE CASCADE,
  nik VARCHAR(20) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  tempat_lahir VARCHAR(100) NOT NULL,
  tanggal_lahir DATE NOT NULL,
  jenis_kelamin VARCHAR(20) NOT NULL,
  alamat TEXT NOT NULL,
  nama_ayah VARCHAR(255),
  pekerjaan_ayah VARCHAR(100),
  nama_ibu VARCHAR(255),
  pekerjaan_ibu VARCHAR(100),
  no_hp_ortu VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Data Sekolah table
CREATE TABLE IF NOT EXISTS ppdb_data_sekolah (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendaftar_id UUID NOT NULL REFERENCES ppdb_pendaftar(id) ON DELETE CASCADE,
  npsn VARCHAR(20),
  nama_sekolah VARCHAR(255) NOT NULL,
  status_sekolah VARCHAR(20) NOT NULL,
  alamat_sekolah TEXT,
  tahun_lulus INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Nilai Raport table
CREATE TABLE IF NOT EXISTS ppdb_nilai_raport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendaftar_id UUID NOT NULL REFERENCES ppdb_pendaftar(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  b_indonesia VARCHAR(5),
  b_inggris VARCHAR(5),
  matematika VARCHAR(5),
  ipa VARCHAR(5),
  ips VARCHAR(5),
  rata_rata VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Prestasi table
CREATE TABLE IF NOT EXISTS ppdb_prestasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendaftar_id UUID NOT NULL REFERENCES ppdb_pendaftar(id) ON DELETE CASCADE,
  jenis VARCHAR(50) NOT NULL,
  tingkat VARCHAR(50) NOT NULL,
  nama_kegiatan VARCHAR(255) NOT NULL,
  peringkat VARCHAR(50),
  tahun INTEGER,
  file_sertifikat VARCHAR(500),
  bobot_nilai VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Dokumen table
CREATE TABLE IF NOT EXISTS ppdb_dokumen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendaftar_id UUID NOT NULL REFERENCES ppdb_pendaftar(id) ON DELETE CASCADE,
  jenis_dokumen VARCHAR(50) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default config and jalur
INSERT INTO ppdb_config (tahun_ajaran, nama_sistem, is_active)
VALUES ('2026/2027', 'SIMPMB 2026', true)
ON CONFLICT DO NOTHING;

-- Seed 2 jalur for the first config
DO $$
DECLARE
  config_uuid UUID;
BEGIN
  SELECT id INTO config_uuid FROM ppdb_config WHERE tahun_ajaran = '2026/2027' LIMIT 1;
  IF config_uuid IS NOT NULL THEN
    INSERT INTO ppdb_jalur (config_id, nama_jalur, kuota, nilai_minimum, requires_prestasi, bobot_nilai, bobot_prestasi, is_active, persyaratan, deskripsi)
    VALUES
      (config_uuid, 'PRESTASI', 30, 80, true, 70, 30, false,
       'Nilai rata-rata raport ≥ 80;Sertifikat prestasi minimal tingkat Kabupaten;Lulus SMP/MTs',
       'Jalur khusus bagi calon siswa berprestasi di bidang akademik maupun non-akademik.'),
      (config_uuid, 'REGULER', 145, 70, false, 100, 0, false,
       'Nilai rata-rata raport ≥ 70;Berdomisili dalam zonasi sekolah;Lulus SMP/MTs',
       'Jalur umum bagi seluruh calon siswa yang memenuhi persyaratan dasar.')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
