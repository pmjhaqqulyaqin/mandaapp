-- ============================================================
-- MIGRASI DATA: Remap type dari shortName ke service.id (slug)
-- Jalankan di database produksi (VPS) setelah deploy
-- ============================================================

-- Survey
UPDATE service_requests SET type = 'survey-layanan' WHERE type = 'Survey';

-- Layanan Utama
UPDATE service_requests SET type = 'surat-keterangan' WHERE type = 'Surat Keterangan';
UPDATE service_requests SET type = 'legalisir-online' WHERE type = 'Legalisir';
UPDATE service_requests SET type = 'izin-siswa' WHERE type = 'Izin Siswa';
UPDATE service_requests SET type = 'izin-penelitian' WHERE type = 'Izin Penelitian';
UPDATE service_requests SET type = 'izin-sosialisasi' WHERE type = 'Izin Sosialisasi';
UPDATE service_requests SET type = 'izin-magang' WHERE type = 'Izin Magang';
UPDATE service_requests SET type = 'buku-tamu' WHERE type = 'Buku Tamu';
UPDATE service_requests SET type = 'layanan-pengaduan' WHERE type = 'Pengaduan Masyarakat';

-- Juga update survey yang sudah ada agar statusnya completed
UPDATE service_requests SET status = 'completed' WHERE type = 'survey-layanan' AND status = 'pending';

-- Verifikasi
SELECT type, COUNT(*) as count FROM service_requests GROUP BY type ORDER BY type;
