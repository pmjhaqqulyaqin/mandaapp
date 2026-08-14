<?php
/**
 * Contoh Script Sinkronisasi Data MandaApp (Aplikasi Sumber) -> Aplikasi Tujuan
 * 
 * Script ini bisa disimpan di aplikasi tujuan (misal: Absensi, Perpus, dll).
 * Anda bisa membuat tombol "Sinkronisasi" di UI aplikasi Anda yang akan memanggil script ini.
 */

// Konfigurasi
$apiUrl = "https://mandaapp.anda.com/api/integrations"; // Ganti dengan URL MandaApp Anda
$apiKey = "YOUR_API_KEY_HERE"; // Ganti dengan API Key yang digenerate di Dashboard MandaApp

/**
 * Fungsi pembantu untuk melakukan request ke API MandaApp
 */
function fetchFromMandaApp($endpoint, $lastSync = null) {
    global $apiUrl, $apiKey;
    
    $url = $apiUrl . $endpoint;
    if ($lastSync) {
        $url .= "?last_sync=" . urlencode($lastSync);
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "x-api-key: " . $apiKey,
        "Accept: application/json"
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        die("Error fetching data. HTTP Code: " . $httpCode . "\nResponse: " . $response);
    }

    return json_decode($response, true);
}

// ---------------------------------------------------------
// Contoh 1: Sinkronisasi Data Pegawai
// ---------------------------------------------------------
echo "<h3>1. Sinkronisasi Pegawai</h3>";
// Opsional: Ambil tanggal terakhir sinkronisasi dari database Anda
// $lastSyncPegawai = "2026-08-15T00:00:00Z"; 
$lastSyncPegawai = null; // null = tarik semua data

$pegawaiData = fetchFromMandaApp("/v1/employees", $lastSyncPegawai);

if ($pegawaiData['success']) {
    echo "Berhasil menarik " . $pegawaiData['count'] . " data pegawai.<br>";
    foreach ($pegawaiData['data'] as $pegawai) {
        echo "- " . $pegawai['name'] . " (" . $pegawai['nip'] . ")<br>";
        
        // TODO: Simpan atau update ke tabel pegawai di database Anda
        // $sql = "INSERT INTO pegawai (id, nama, nip) VALUES (...) ON DUPLICATE KEY UPDATE ...";
    }
}

// ---------------------------------------------------------
// Contoh 2: Sinkronisasi Data Siswa dan Kelas
// ---------------------------------------------------------
echo "<h3>2. Sinkronisasi Siswa dan Kelas</h3>";
$siswaData = fetchFromMandaApp("/v1/classes-students");

if ($siswaData['success']) {
    $kelas = $siswaData['data']['classes'];
    $siswa = $siswaData['data']['students'];
    
    echo "Berhasil menarik " . count($kelas) . " kelas dan " . count($siswa) . " siswa aktif.<br>";
    
    // TODO: Simpan ke tabel kelas dan tabel siswa Anda
}

// ---------------------------------------------------------
// Contoh 3: Sinkronisasi Data Presensi
// ---------------------------------------------------------
echo "<h3>3. Sinkronisasi Presensi</h3>";
$lastSyncPresensi = date('Y-m-d\TH:i:s\Z', strtotime('-1 days')); // Contoh tarik data 1 hari terakhir
$presensiData = fetchFromMandaApp("/v1/attendances", $lastSyncPresensi);

if ($presensiData['success']) {
    echo "Berhasil menarik " . $presensiData['count'] . " data presensi terbaru.<br>";
    
    // TODO: Simpan histori presensi ke aplikasi Anda
}

echo "<hr><p>Sinkronisasi Selesai.</p>";
?>
