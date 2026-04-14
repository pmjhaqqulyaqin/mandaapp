-- Script untuk memperbarui format nomor pendaftaran PPDB yang sudah ada 
-- dari format lama (PMB2026/00004) menjadi format baru (MND2604MTS0101001)

UPDATE ppdb_pendaftar p
SET no_pendaftaran = 
  'MND' || 
  to_char(COALESCE(p.tgl_daftar, CURRENT_DATE), 'YYMM') || 
  CASE WHEN upper(s.nama_sekolah) LIKE '%SMP%' THEN 'SMP' ELSE 'MTS' END || 
  CASE WHEN lower(s.status_sekolah) = 'swasta' THEN '02' ELSE '01' END || 
  CASE WHEN lower(d.jenis_kelamin) = 'perempuan' THEN '02' ELSE '01' END || 
  RIGHT(p.no_pendaftaran, 3)
FROM ppdb_data_diri d, ppdb_data_sekolah s
WHERE p.id = d.pendaftar_id 
  AND p.id = s.pendaftar_id 
  AND p.no_pendaftaran LIKE 'PMB%';
