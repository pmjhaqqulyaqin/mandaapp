# 📘 Panduan Integrasi Sistem MandaApp

Dokumen ini berisi panduan lengkap bagi **Admin MandaApp** dan **Programmer Aplikasi Eksternal** untuk menghubungkan aplikasi pihak ketiga (Absensi, Perpustakaan, Lapkin, dll.) dengan sistem MandaApp.

---

## 📋 Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Langkah untuk Admin MandaApp](#langkah-untuk-admin-mandaapp)
3. [Langkah untuk Programmer Aplikasi Eksternal](#langkah-untuk-programmer-aplikasi-eksternal)
4. [Daftar Endpoint API](#daftar-endpoint-api)
5. [Contoh Response API](#contoh-response-api)
6. [Tips Implementasi Tombol Sinkron](#tips-implementasi-tombol-sinkron)
7. [Troubleshooting](#troubleshooting)

---

## Gambaran Umum

Fitur **Integrasi API** MandaApp memungkinkan aplikasi lain menarik data secara aman menggunakan **API Key**. Fitur ini mendukung mekanisme **sinkronisasi incremental** (sebagian) melalui parameter `last_sync`, sehingga:

- ✅ Tidak perlu menarik seluruh data setiap kali sinkronisasi
- ✅ Hanya data yang berubah/baru saja yang akan dikirim
- ✅ Server tidak terbebani karena sinkronisasi dilakukan on-demand (tombol diklik)

### Data yang Tersedia

| No | Data | Endpoint | Keterangan |
|----|------|----------|------------|
| 1 | **Data Pegawai / Guru** | `/v1/employees` | Nama, NIP, jabatan, status, foto, dll. |
| 2 | **Data Kelas & Siswa** | `/v1/classes-students` | Daftar kelas beserta siswa aktif |
| 3 | **Data Presensi** | `/v1/attendances` | Rekap kehadiran harian siswa |

---

## Langkah untuk Admin MandaApp

### 1. Buka Menu Integrasi API
Login ke MandaApp sebagai **Admin**, lalu buka menu:
**Dashboard → Integrasi API** (terletak di kategori *Administrator* pada sidebar).

### 2. Daftarkan Aplikasi Baru
- Masukkan nama aplikasi tujuan, contoh: `Aplikasi Absensi Fingerprint`
- Klik tombol **Generate API Key**

### 3. Salin API Key
- Setelah berhasil, API Key akan muncul (format: `sk_live_...`)
- Klik tombol **Copy** untuk menyalin
- **⚠️ PENTING**: Simpan API Key ini dengan aman. Berikan hanya kepada pihak yang berwenang.

### 4. Berikan ke Programmer
Serahkan kepada tim IT / programmer aplikasi tujuan:
- ✅ **API Key** yang sudah di-copy
- ✅ **File `integration-example.php`** (dari folder ini)
- ✅ **Dokumen panduan ini**

### 5. Kelola API Key
Dari halaman Integrasi API, Anda dapat:
- 🔴 **Nonaktifkan** API Key jika aplikasi tidak digunakan sementara
- 🟢 **Aktifkan kembali** API Key yang dinonaktifkan
- 🗑️ **Hapus** API Key secara permanen jika sudah tidak diperlukan

---

## Langkah untuk Programmer Aplikasi Eksternal

### Persyaratan
- PHP 7.4+ dengan ekstensi **cURL** aktif
- Koneksi internet ke server MandaApp

### Cara Cepat
1. Copy file `integration-example.php` ke proyek Anda
2. Ubah 2 variabel konfigurasi di bagian atas file:
   ```php
   $apiUrl = "https://domain-mandaapp.com/api/integrations";  // URL MandaApp
   $apiKey = "sk_live_xxxxxxxxxxxx";                           // API Key dari admin
   ```
3. Panggil fungsi yang tersedia sesuai kebutuhan:
   ```php
   $pegawai = sinkronPegawai();               // Tarik semua pegawai
   $pegawai = sinkronPegawai("2026-08-01");   // Tarik yang berubah sejak tanggal ini
   
   $data = sinkronKelasAndSiswa();            // Tarik kelas & siswa
   
   $presensi = sinkronPresensi("2026-08-14"); // Tarik presensi sejak tanggal ini
   ```

---

## Daftar Endpoint API

Semua endpoint harus menyertakan header:
```
x-api-key: YOUR_API_KEY_HERE
```

### 1. Tarik Data Pegawai
```http
GET /api/integrations/v1/employees
GET /api/integrations/v1/employees?last_sync=2026-08-01
```

### 2. Tarik Data Kelas & Siswa
```http
GET /api/integrations/v1/classes-students
GET /api/integrations/v1/classes-students?last_sync=2026-08-01
```

### 3. Tarik Data Presensi
```http
GET /api/integrations/v1/attendances
GET /api/integrations/v1/attendances?last_sync=2026-08-14
```

> **Parameter `last_sync`** (opsional): Format tanggal `YYYY-MM-DD` atau ISO 8601 (`2026-08-15T00:00:00Z`). Jika disertakan, hanya data yang diperbarui setelah tanggal tersebut yang akan dikembalikan.

---

## Contoh Response API

### Response Pegawai
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "uuid-1234",
      "name": "Ahmad Fauzi, S.Pd",
      "nip": "198501012010011001",
      "type": "Guru",
      "position": "Guru Matematika",
      "gender": "Laki-laki",
      "status": "active",
      "updatedAt": "2026-08-15T03:00:00.000Z"
    }
  ]
}
```

### Response Kelas & Siswa
```json
{
  "success": true,
  "data": {
    "classes": [
      { "id": "uuid-class-1", "name": "X IPA 1" }
    ],
    "students": [
      {
        "id": "uuid-student-1",
        "fullName": "Aisyah Putri",
        "nis": "12345",
        "nisn": "001234567890",
        "classId": "uuid-class-1",
        "className": "X IPA 1",
        "gender": "Perempuan",
        "status": "active"
      }
    ]
  }
}
```

### Response Presensi
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "uuid-att-1",
      "studentId": "uuid-student-1",
      "classId": "uuid-class-1",
      "date": "2026-08-15",
      "checkIn": "06:45:00",
      "checkOut": "13:30:00",
      "status": "Hadir",
      "method": "qr_scan"
    }
  ]
}
```

---

## Tips Implementasi Tombol Sinkron

Agar sinkronisasi efisien, simpan waktu sinkronisasi terakhir di database aplikasi Anda:

```php
// 1. Ambil waktu sinkronisasi terakhir dari database
$lastSync = $pdo->query("SELECT last_sync_pegawai FROM konfigurasi")->fetchColumn();

// 2. Tarik data yang berubah sejak waktu tersebut
$pegawai = sinkronPegawai($lastSync);

// 3. Simpan data ke database lokal
foreach ($pegawai as $p) {
    // INSERT ... ON DUPLICATE KEY UPDATE ...
}

// 4. Update waktu sinkronisasi
$pdo->exec("UPDATE konfigurasi SET last_sync_pegawai = NOW()");
```

Dengan pola ini, setiap kali tombol **"Sinkron"** diklik:
- Klik pertama → Menarik **semua** data (karena `last_sync` masih kosong)
- Klik berikutnya → Hanya menarik data **baru/berubah** saja ✅

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| HTTP 401 - Unauthorized | API Key salah atau tidak dikirim | Pastikan header `x-api-key` terisi dengan benar |
| HTTP 403 - Forbidden | API Key sudah dinonaktifkan | Hubungi admin MandaApp untuk mengaktifkan kembali |
| HTTP 500 - Server Error | Kesalahan internal server | Coba lagi. Jika terus terjadi, hubungi admin |
| Koneksi Timeout | Server tidak bisa dijangkau | Periksa koneksi internet dan URL MandaApp |
| Data kosong | Belum ada data di MandaApp | Pastikan data sudah diinput di MandaApp terlebih dahulu |

---

> 📌 **Catatan**: Jika ada kebutuhan endpoint baru (misal: data nilai, data jadwal, dll.), hubungi tim pengembang MandaApp untuk menambahkannya.
