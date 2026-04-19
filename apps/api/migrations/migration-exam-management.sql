-- Migration: Exam Management Module
-- Date: 2026-04-10
-- Description: Creates tables for Manajemen Ujian feature

-- 1. Master Ujian
CREATE TABLE IF NOT EXISTS ujian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_ujian VARCHAR(255) NOT NULL,
  jenis VARCHAR(50) NOT NULL,
  tahun_ajaran VARCHAR(20) NOT NULL,
  semester VARCHAR(10) NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  ketua_panitia_id UUID REFERENCES employees(id),
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Panitia Ujian
CREATE TABLE IF NOT EXISTS panitia_ujian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE NOT NULL,
  pegawai_id UUID REFERENCES employees(id) NOT NULL,
  jabatan VARCHAR(100) NOT NULL,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Jadwal Ujian
CREATE TABLE IF NOT EXISTS jadwal_ujian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE NOT NULL,
  tanggal DATE NOT NULL,
  waktu_mulai TIME NOT NULL,
  waktu_selesai TIME NOT NULL,
  mata_pelajaran VARCHAR(150) NOT NULL,
  kelas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Ruang Ujian
CREATE TABLE IF NOT EXISTS ruang_ujian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE NOT NULL,
  nama_ruang VARCHAR(100) NOT NULL,
  kapasitas INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Penugasan Pengawas
CREATE TABLE IF NOT EXISTS penugasan_pengawas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jadwal_id UUID REFERENCES jadwal_ujian(id) ON DELETE CASCADE NOT NULL,
  ruang_id UUID REFERENCES ruang_ujian(id) ON DELETE CASCADE NOT NULL,
  pengawas_id UUID REFERENCES employees(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Distribusi Peserta
CREATE TABLE IF NOT EXISTS distribusi_peserta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ujian_id UUID REFERENCES ujian(id) ON DELETE CASCADE NOT NULL,
  ruang_id UUID REFERENCES ruang_ujian(id) ON DELETE CASCADE NOT NULL,
  siswa_id UUID REFERENCES student_profiles(id) NOT NULL,
  nomor_meja INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
