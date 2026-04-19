-- Performance indexes for frequently-queried columns
-- Run this migration after deployment: psql $DATABASE_URL -f migrations/add_indexes.sql

-- Student profiles
CREATE INDEX IF NOT EXISTS idx_student_profiles_nisn ON student_profiles (nisn);
CREATE INDEX IF NOT EXISTS idx_student_profiles_full_name ON student_profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_student_profiles_class_id ON student_profiles (class_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_status ON student_profiles (status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles (user_id);

-- News
CREATE INDEX IF NOT EXISTS idx_news_announcements_status ON news_announcements (status);
CREATE INDEX IF NOT EXISTS idx_news_announcements_publish_date ON news_announcements (publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_announcements_author ON news_announcements (author_id);

-- PPDB
CREATE INDEX IF NOT EXISTS idx_ppdb_pendaftar_jalur ON ppdb_pendaftar (jalur_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_pendaftar_nisn ON ppdb_pendaftar (nisn);
CREATE INDEX IF NOT EXISTS idx_ppdb_pendaftar_status ON ppdb_pendaftar (status);
CREATE INDEX IF NOT EXISTS idx_ppdb_pendaftar_tgl_daftar ON ppdb_pendaftar (tgl_daftar DESC);
CREATE INDEX IF NOT EXISTS idx_ppdb_data_diri_pendaftar ON ppdb_data_diri (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_data_sekolah_pendaftar ON ppdb_data_sekolah (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_nilai_raport_pendaftar ON ppdb_nilai_raport (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_prestasi_pendaftar ON ppdb_prestasi (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_dokumen_pendaftar ON ppdb_dokumen (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_nilai_tes_pendaftar ON ppdb_nilai_tes (pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_nilai_tes_config ON ppdb_nilai_tes (tes_config_id);
CREATE INDEX IF NOT EXISTS idx_ppdb_jalur_config ON ppdb_jalur (config_id);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session (user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session (expires_at);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_nip ON employees (nip);
CREATE INDEX IF NOT EXISTS idx_employees_type ON employees (type);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);

-- Classes
CREATE INDEX IF NOT EXISTS idx_classes_major ON classes (major_id);

-- Gallery
CREATE INDEX IF NOT EXISTS idx_gallery_uploaded_at ON gallery_images (uploaded_at DESC);

-- Exam
CREATE INDEX IF NOT EXISTS idx_jadwal_ujian_id ON jadwal_ujian (ujian_id);
CREATE INDEX IF NOT EXISTS idx_distribusi_ujian_id ON distribusi_peserta (ujian_id);
CREATE INDEX IF NOT EXISTS idx_distribusi_ruang_id ON distribusi_peserta (ruang_id);

-- NIS batches

-- Site settings
CREATE INDEX IF NOT EXISTS idx_site_settings_group ON site_settings ("group");

-- Contact messages
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);
