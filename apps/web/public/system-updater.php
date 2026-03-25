<?php
/**
 * MandaApp - Secure System Update Bridge
 * 
 * Skrip ini bertugas menerima file ZIP dari backend Railway Node.js
 * dan mengekstraknya secara lokal di cPanel (Dewahoster) dengan sangat cepat,
 * serta membuat sistem cadangan (backup/rollback).
 * 
 * PERINGATAN: GANTI SECRET INI ATAU PASTIKAN SAMA DENGAN VARIABEL DI BACKEND
 */

// Konfigurasi Header dan CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Sesuaikan dengan domain backend
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================================
// KONFIGURASI 
// ============================================================================
// Sama dengan UPDATE_SECRET di .env Backend Railway
$SECRET_KEY = getenv('UPDATE_SECRET') ?: 'MandaApp_Secret_Key_Update_2026!'; 
$BACKUP_DIR = __DIR__ . '/backups/';
$TEMP_DIR = __DIR__ . '/tmp_update/';
$ARCHIVE_DIR = __DIR__ . '/archives/';

// Pastikan folder tersedia
if (!is_dir($BACKUP_DIR)) mkdir($BACKUP_DIR, 0755, true);
if (!is_dir($TEMP_DIR)) mkdir($TEMP_DIR, 0755, true);
if (!is_dir($ARCHIVE_DIR)) mkdir($ARCHIVE_DIR, 0755, true);

// ============================================================================
// OTENTIKASI
// ============================================================================
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

if (strpos($authHeader, 'Bearer ') === 0) {
    $token = substr($authHeader, 7);
} else {
    $token = isset($_GET['token']) ? $_GET['token'] : '';
}

if ($token !== $SECRET_KEY) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized Access']);
    exit;
}

// Helper untuk menghapus direktori berserta isinya (Rekursif)
function deleteDir($dirPath) {
    if (! is_dir($dirPath)) return;
    if (substr($dirPath, strlen($dirPath) - 1, 1) != '/') {
        $dirPath .= '/';
    }
    $files = glob($dirPath . '*', GLOB_MARK);
    foreach ($files as $file) {
        if (is_dir($file)) {
            deleteDir($file);
        } else {
            unlink($file);
        }
    }
    rmdir($dirPath);
}

// Helper untuk menyalin direktori secara rekursif
function copyDir($src, $dst) {
    $dir = opendir($src);
    @mkdir($dst, 0755, true);
    while (false !== ( $file = readdir($dir)) ) {
        if (( $file != '.' ) && ( $file != '..' )) {
            if ( is_dir($src . '/' . $file) ) {
                copyDir($src . '/' . $file, $dst . '/' . $file);
            } else {
                copy($src . '/' . $file, $dst . '/' . $file);
            }
        }
    }
    closedir($dir);
}

// ============================================================================
// ROUTING AKSI
// ============================================================================
$action = isset($_GET['action']) ? $_GET['action'] : 'update';

try {
    if ($action === 'check') {
        // Cek koneksi dan versi PHP
        echo json_encode(['success' => true, 'message' => 'Update Bridge Online', 'php_version' => phpversion(), 'writable' => is_writable(__DIR__)]);
        exit;
    }

    if ($action === 'rollback') {
        // ... (rollback logic remains same, but let's ensure it returns detailed info)
        $backups = glob($BACKUP_DIR . 'backup_*', GLOB_ONLYDIR);
        if (empty($backups)) throw new Exception("Tidak ada backup.");
        rsort($backups);
        $latestBackup = $backups[0];
        copyDir($latestBackup, __DIR__);
        echo json_encode(['success' => true, 'message' => "Rollback ke " . basename($latestBackup) . " berhasil."]);
        exit;
    }

    if ($action === 'update' || $action === 'download_update') {
        $tmpZipPath = '';
        
        if ($action === 'update') {
            if (!isset($_FILES['package'])) throw new Exception("File ZIP tidak ditemukan di dalam request.");
            if ($_FILES['package']['error'] !== UPLOAD_ERR_OK) {
                $errCode = $_FILES['package']['error'];
                $msg = "Upload error (Code: $errCode). ";
                if ($errCode === 1 || $errCode === 2) $msg .= "File terlalu besar (melebihi limit PHP).";
                throw new Exception($msg);
            }
            $tmpZipPath = $_FILES['package']['tmp_name'];
        } else if ($action === 'download_update') {
            $json = json_decode(file_get_contents('php://input'), true);
            if (!isset($json['url'])) throw new Exception("URL download tidak ditemukan.");
            $downloadUrl = $json['url'];
            
            // Download using cURL memory safe stream
            $tmpZipPath = $TEMP_DIR . 'downloaded_update.zip';
            $fp = fopen($tmpZipPath, 'w+');
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $downloadUrl);
            curl_setopt($ch, CURLOPT_FILE, $fp);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 300);
            curl_exec($ch);
            if (curl_errno($ch)) {
                $err = curl_error($ch);
                curl_close($ch);
                fclose($fp);
                throw new Exception("cURL Error: " . $err);
            }
            curl_close($ch);
            fclose($fp);
            
            if (!file_exists($tmpZipPath) || filesize($tmpZipPath) === 0) {
               throw new Exception("Gagal mendownload ZIP atau file kosong.");
            }
        }

        // 1. Backup
        $timestamp = time();
        $currentBackupPath = $BACKUP_DIR . 'backup_' . $timestamp . '/';
        @mkdir($currentBackupPath, 0755, true);
        if (file_exists(__DIR__ . '/index.html')) copy(__DIR__ . '/index.html', $currentBackupPath . 'index.html');
        if (is_dir(__DIR__ . '/assets')) copyDir(__DIR__ . '/assets', $currentBackupPath . 'assets');

        // 2. Extract
        if (!class_exists('ZipArchive')) {
            throw new Exception("Ekstensi PHP 'ZipArchive' tidak terpasang di server ini. Hubungi admin.");
        }

        $zip = new ZipArchive;
        $res = $zip->open($tmpZipPath);
        if ($res === TRUE) {
            $extractTarget = $TEMP_DIR . 'extract/';
            if (is_dir($extractTarget)) deleteDir($extractTarget);
            @mkdir($extractTarget, 0755, true);
            
            $zip->extractTo($extractTarget);
            $zip->close();
            
            // 3. Robust Folder Detection
            $sourceDir = $extractTarget;
            $items = array_diff(scandir($extractTarget), array('..', '.'));
            
            if (count($items) === 1) {
                $itemKey = reset($items);
                $possibleDir = $extractTarget . $itemKey;
                if (is_dir($possibleDir)) {
                    $sourceDir = $possibleDir . '/';
                }
            } else if (is_dir($extractTarget . 'dist')) {
                $sourceDir = $extractTarget . 'dist/';
            }

            if (!file_exists($sourceDir . 'index.html')) {
                $found = false;
                $directory = new RecursiveDirectoryIterator($extractTarget);
                $iterator = new RecursiveIteratorIterator($directory);
                foreach($iterator as $file) {
                    if ($file->getFilename() === 'index.html') {
                        $sourceDir = dirname($file->getPathname()) . '/';
                        $found = true;
                        break;
                    }
                }
                if (!$found) throw new Exception("Struktur ZIP tidak valid: File 'index.html' tidak ditemukan.");
            }

            // 4. Install
            if (is_dir(__DIR__ . '/assets')) deleteDir(__DIR__ . '/assets');
            copyDir($sourceDir, __DIR__);
            
            // Clean up
            deleteDir($TEMP_DIR);

            echo json_encode([
                'success' => true, 
                'message' => 'Sistem berhasil diperbarui ke server Dewahoster!',
                'details' => [
                    'source_detected' => basename($sourceDir),
                    'timestamp' => $timestamp,
                    'backup' => 'backup_' . $timestamp
                ]
            ]);
            exit;
        } else {
            $errText = "Gagal membuka file ZIP (Error Code: $res).";
            if ($res === 19) $errText .= " - Not a zip archive or corrupted.";
            throw new Exception($errText);
        }
    }

    if ($action === 'upload_archive') {
        if (!isset($_FILES['file'])) throw new Exception("File tidak terkirim ke server.");
        
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errCode = $file['error'];
            $msg = "Gagal mengunggah file (Kode: $errCode). ";
            if ($errCode === 1 || $errCode === 2) {
                $msg .= "Ukuran file terlalu besar (melebihi limit PHP server hosting).";
            }
            throw new Exception($msg);
        }
        
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeName = 'archive_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $targetPath = $ARCHIVE_DIR . $safeName;
        
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'];
            $fileUrl = "$protocol://$host/archives/$safeName";
            
            echo json_encode([
                'success' => true,
                'message' => 'File berhasil diunggah ke hosting.',
                'url' => $fileUrl,
                'filename' => $safeName
            ]);
            exit;
        } else {
            throw new Exception("Gagal memindahkan file ke direktori archives.");
        }
    }

    if ($action === 'delete_archive') {
        $json = json_decode(file_get_contents('php://input'), true);
        if (!isset($json['filename'])) throw new Exception("Nama file tidak ditentukan untuk dihapus.");
        
        $filename = basename($json['filename']); // Security: prevent traversal
        $targetPath = $ARCHIVE_DIR . $filename;
        
        if (file_exists($targetPath)) {
            unlink($targetPath);
            echo json_encode(['success' => true, 'message' => "File $filename berhasil dihapus."]);
        } else {
            echo json_encode(['success' => true, 'message' => "File $filename tidak ditemukan (sudah terhapus)."]);
        }
        exit;
    }

    throw new Exception("Aksi tidak valid.");

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
