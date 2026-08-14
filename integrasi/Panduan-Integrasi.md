# Panduan Integrasi Sistem MandaApp

Dokumen ini berisi panduan bagi Anda (dan juga programmer / admin aplikasi eksternal) untuk menghubungkan aplikasi Anda (misalnya Aplikasi Absensi, Perpustakaan, Lapkin) dengan **MandaApp**.

## Gambaran Umum

Fitur Integrasi API ini dirancang agar aplikasi pihak ketiga dapat menarik data dari sistem MandaApp dengan aman. Kita menggunakan **API Key** khusus untuk memproteksi akses. Selain itu, fitur ini mendukung mekanisme `last_sync` (sinkronisasi sebagian) sehingga Anda tidak perlu menarik seluruh data setiap kali sinkronisasi dilakukan—cukup menarik data yang berubah saja sejak sinkronisasi terakhir.

## Langkah-Langkah di MandaApp (Untuk Admin MandaApp)

1. **Login** ke MandaApp dengan akun Admin Anda.
2. Buka menu **Dashboard > Integrasi API** (terletak di bawah kategori Administrator).
3. **Tambahkan Aplikasi Baru**: Masukkan nama aplikasi tujuan (misal: "Aplikasi Absensi Desktop") lalu klik **Generate API Key**.
4. **Copy API Key** yang muncul. API Key ini (berawalan `sk_live_...`) adalah rahasia dan akan berfungsi sebagai password bagi aplikasi luar.
5. Jika di masa mendatang aplikasi tersebut tidak lagi digunakan, Anda bisa menonaktifkan atau menghapus API Key-nya dari halaman tersebut.

## Langkah-Langkah untuk Programmer Aplikasi Eksternal

Berikan **API Key** yang sudah Anda copy tadi beserta file [integration-example.php](file:///E:/Aantigravity/mandaapp/integrasi/integration-example.php) kepada tim IT / programmer aplikasi tujuan Anda.

### Informasi Endpoint API:

Semua endpoint dilindungi dan **wajib** menyertakan header `x-api-key: <API_KEY_ANDA>`.

- **Tarik Data Pegawai**
  ```http
  GET /api/integrations/v1/employees
  ```
  *(Tambahkan `?last_sync=YYYY-MM-DD` untuk mengambil data yang diubah setelah tanggal tersebut)*

- **Tarik Data Siswa & Kelas**
  ```http
  GET /api/integrations/v1/classes-students
  ```
  *(Sama, mendukung filter `last_sync`)*

- **Tarik Data Presensi**
  ```http
  GET /api/integrations/v1/attendances
  ```

### Rekomendasi Implementasi di Aplikasi Tujuan

- **Buat Tombol Sinkronisasi**: Di aplikasi Absensi/Perpus, buatlah sebuah tombol "Tarik Data dari MandaApp". Ketika ditekan, tombol ini akan menjalankan script yang memanggil MandaApp (seperti pada contoh `integration-example.php`).
- **Simpan Tanggal Sinkron**: Simpan tanggal dan waktu terakhir sinkronisasi di database Anda. Saat sinkronisasi berikutnya, kirimkan tanggal tersebut di parameter `last_sync` agar MandaApp hanya mengirim data-data terbaru/yang berubah saja. Ini sangat membantu agar server tidak lemot!

Silakan baca file `integration-example.php` di dalam folder ini untuk melihat contoh kode asli menggunakan cURL PHP.
