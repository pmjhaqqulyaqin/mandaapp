<?php
/**
 * ============================================================
 * MANDAAPP - CONTOH SCRIPT SINKRONISASI DATA
 * ============================================================
 * 
 * Script ini adalah contoh/jembatan bagi aplikasi pihak ketiga
 * (Absensi, Perpustakaan, Lapkin, dll.) untuk menarik data 
 * dari MandaApp.
 * 
 * CARA PENGGUNAAN:
 * 1. Copy file ini ke proyek aplikasi tujuan Anda.
 * 2. Ubah $apiUrl sesuai domain MandaApp Anda.
 * 3. Ubah $apiKey dengan kunci yang digenerate di Dashboard
 *    MandaApp > menu Integrasi API.
 * 4. Panggil fungsi-fungsi di bawah ini sesuai kebutuhan.
 * 
 * KEBUTUHAN:
 * - PHP 7.4+ dengan ekstensi cURL aktif
 * - Koneksi internet ke server MandaApp
 * ============================================================
 */

// ══════════════════════════════════════════════
// KONFIGURASI (WAJIB DIUBAH)
// ══════════════════════════════════════════════
$apiUrl = "https://domain-mandaapp-anda.com/api/integrations";  // Ganti dengan URL MandaApp
$apiKey = "YOUR_API_KEY_HERE";                                   // Ganti dengan API Key dari Dashboard

// ══════════════════════════════════════════════
// FUNGSI UTAMA - Jangan diubah
// ══════════════════════════════════════════════

/**
 * Mengambil data dari API MandaApp
 * 
 * @param string $endpoint  Endpoint API (contoh: "/v1/employees")
 * @param string|null $lastSync  Tanggal sinkronisasi terakhir (format: Y-m-d atau ISO 8601)
 *                               Jika null, semua data akan ditarik.
 * @return array  Data hasil response API
 */
function fetchFromMandaApp($endpoint, $lastSync = null) {
    global $apiUrl, $apiKey;
    
    $url = $apiUrl . $endpoint;
    if ($lastSync) {
        $url .= "?last_sync=" . urlencode($lastSync);
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Timeout 30 detik
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "x-api-key: " . $apiKey,
        "Accept: application/json"
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Error handling
    if ($curlError) {
        return ['success' => false, 'message' => 'Koneksi gagal: ' . $curlError];
    }
    if ($httpCode === 401) {
        return ['success' => false, 'message' => 'API Key tidak valid atau tidak ditemukan.'];
    }
    if ($httpCode === 403) {
        return ['success' => false, 'message' => 'API Key sudah dinonaktifkan oleh admin.'];
    }
    if ($httpCode !== 200) {
        return ['success' => false, 'message' => 'Error HTTP ' . $httpCode . ': ' . $response];
    }

    return json_decode($response, true);
}

// ══════════════════════════════════════════════════════════════
// CONTOH 1: SINKRONISASI DATA PEGAWAI / GURU
// ══════════════════════════════════════════════════════════════

/**
 * Tarik data pegawai dari MandaApp.
 * 
 * @param string|null $lastSync  Tanggal sinkronisasi terakhir (opsional)
 * @return array  Response berisi:
 *   - success (bool)
 *   - count (int) jumlah data
 *   - data (array) daftar pegawai, setiap item berisi:
 *     - id, name, nip, type (Guru/Tenaga Kependidikan),
 *       rank, grade, position, gender, birthPlace, birthDate,
 *       photoUrl, task, status, createdAt, updatedAt
 */
function sinkronPegawai($lastSync = null) {
    $result = fetchFromMandaApp("/v1/employees", $lastSync);
    
    if (!$result || !isset($result['success']) || !$result['success']) {
        echo "❌ Gagal sinkronisasi pegawai: " . ($result['message'] ?? 'Unknown error') . "\n";
        return [];
    }
    
    echo "✅ Berhasil menarik " . $result['count'] . " data pegawai.\n";
    
    // Contoh menyimpan ke database lokal:
    // foreach ($result['data'] as $pegawai) {
    //     $sql = "INSERT INTO pegawai (id_mandaapp, nama, nip, jabatan, status) 
    //             VALUES (:id, :nama, :nip, :jabatan, :status)
    //             ON DUPLICATE KEY UPDATE 
    //                 nama = :nama, jabatan = :jabatan, status = :status";
    //     $stmt = $pdo->prepare($sql);
    //     $stmt->execute([
    //         ':id'      => $pegawai['id'],
    //         ':nama'    => $pegawai['name'],
    //         ':nip'     => $pegawai['nip'],
    //         ':jabatan' => $pegawai['position'],
    //         ':status'  => $pegawai['status'],
    //     ]);
    // }
    
    return $result['data'];
}

// ══════════════════════════════════════════════════════════════
// CONTOH 2: SINKRONISASI DATA KELAS DAN SISWA
// ══════════════════════════════════════════════════════════════

/**
 * Tarik data kelas dan siswa aktif dari MandaApp.
 * 
 * @param string|null $lastSync  Tanggal sinkronisasi terakhir (opsional)
 * @return array  Response berisi:
 *   - success (bool)
 *   - data.classes (array) daftar kelas: id, name, homeroomTeacherId
 *   - data.students (array) daftar siswa aktif: id, fullName, nis, nisn,
 *       classId, className, birthPlace, birthDate, gender, status, dll.
 */
function sinkronKelasAndSiswa($lastSync = null) {
    $result = fetchFromMandaApp("/v1/classes-students", $lastSync);
    
    if (!$result || !isset($result['success']) || !$result['success']) {
        echo "❌ Gagal sinkronisasi kelas & siswa: " . ($result['message'] ?? 'Unknown error') . "\n";
        return ['classes' => [], 'students' => []];
    }
    
    $kelas = $result['data']['classes'];
    $siswa = $result['data']['students'];
    
    echo "✅ Berhasil menarik " . count($kelas) . " kelas dan " . count($siswa) . " siswa aktif.\n";
    
    // Contoh menyimpan ke database lokal:
    // foreach ($kelas as $k) {
    //     $sql = "INSERT INTO kelas (id_mandaapp, nama_kelas) VALUES (:id, :nama)
    //             ON DUPLICATE KEY UPDATE nama_kelas = :nama";
    //     $pdo->prepare($sql)->execute([':id' => $k['id'], ':nama' => $k['name']]);
    // }
    // foreach ($siswa as $s) {
    //     $sql = "INSERT INTO siswa (id_mandaapp, nama, nis, nisn, kelas_id) VALUES (...)
    //             ON DUPLICATE KEY UPDATE ...";
    //     // ...
    // }
    
    return $result['data'];
}

// ══════════════════════════════════════════════════════════════
// CONTOH 3: SINKRONISASI DATA PRESENSI / ABSENSI
// ══════════════════════════════════════════════════════════════

/**
 * Tarik data presensi siswa dari MandaApp.
 * 
 * @param string|null $lastSync  Tanggal sinkronisasi terakhir (opsional)
 * @return array  Response berisi:
 *   - success (bool)
 *   - count (int) jumlah data
 *   - data (array) daftar presensi, setiap item berisi:
 *     - id, studentId, classId, date, checkIn, checkOut,
 *       status (Hadir/Terlambat/Alpa/Sakit/Izin/Bolos),
 *       method (qr_scan/manual/usb_scanner), note, updatedAt
 */
function sinkronPresensi($lastSync = null) {
    $result = fetchFromMandaApp("/v1/attendances", $lastSync);
    
    if (!$result || !isset($result['success']) || !$result['success']) {
        echo "❌ Gagal sinkronisasi presensi: " . ($result['message'] ?? 'Unknown error') . "\n";
        return [];
    }
    
    echo "✅ Berhasil menarik " . $result['count'] . " data presensi.\n";
    
    return $result['data'];
}

// ══════════════════════════════════════════════════════════════
// CONTOH PEMANGGILAN
// ══════════════════════════════════════════════════════════════
// Letakkan kode di bawah pada tombol "Sinkronisasi" di UI Anda.
// Hapus komentar (//) untuk menjalankan.

// --- Tarik SEMUA data pegawai ---
// $pegawai = sinkronPegawai();

// --- Tarik data pegawai yang berubah sejak tanggal tertentu ---
// $pegawai = sinkronPegawai("2026-08-01");

// --- Tarik SEMUA data kelas & siswa ---
// $data = sinkronKelasAndSiswa();
// $kelas = $data['classes'];
// $siswa = $data['students'];

// --- Tarik data presensi 7 hari terakhir ---
// $tanggal7HariLalu = date('Y-m-d', strtotime('-7 days'));
// $presensi = sinkronPresensi($tanggal7HariLalu);

// ══════════════════════════════════════════════════════════════
// TIPS IMPLEMENTASI TOMBOL SINKRON
// ══════════════════════════════════════════════════════════════
// 
// 1. Simpan waktu sinkronisasi terakhir di database Anda:
//    $pdo->exec("UPDATE konfigurasi SET last_sync_pegawai = NOW()");
//
// 2. Saat tombol diklik, ambil waktu tersebut:
//    $lastSync = $pdo->query("SELECT last_sync_pegawai FROM konfigurasi")->fetchColumn();
//    $pegawai = sinkronPegawai($lastSync);
//
// 3. Setelah berhasil, update lagi waktu sinkronisasi:
//    $pdo->exec("UPDATE konfigurasi SET last_sync_pegawai = NOW()");
//
// Dengan cara ini, setiap klik tombol hanya menarik data BARU/BERUBAH saja.
// ══════════════════════════════════════════════════════════════
?>
