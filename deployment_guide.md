# Panduan Implementasi Update Mandaapp (Docker VPS)

Halo Pak, berikut adalah langkah-langkah untuk menerapkan update terbaru (Perbaikan PDF & UI) di VPS Bapak.

> [!IMPORTANT]
> Pastikan Bapak sudah melakukan `git push` dari komputer lokal atau saya sudah mengonfirmasi bahwa perubahan telah di-push ke GitHub sebelum mencoba langkah di bawah ini.

### Langkah-langkah di Terminal VPS:

1. **Masuk ke folder project:**
   ```bash
   cd /path/ke/folder/mandaapp
   ```
   *(Sesuaikan path di atas dengan lokasi folder mandaapp di VPS Bapak)*

2. **Tarik perubahan terbaru dari GitHub:**
   ```bash
   git pull origin main
   ```

3. **Rebuild container Web (karena perubahan ada di sisi Frontend):**
   ```bash
   docker-compose build web
   ```

4. **Restart container Web agar menggunakan image yang baru dibuild:**
   ```bash
   docker-compose up -d web
   ```

5. **(Opsional) Cek status container:**
   ```bash
   docker-compose ps
   ```

### Catatan Penting:
- **Layar Abu-abu Masal**: Jika ada berita lama yang masih menunjukkan kotak abu-abu, Bapak cukup edit berita tersebut di Dashboard, hapus blok PDF lama, lalu upload ulang. Update ini akan memastikan upload selanjutnya tampil "gagah" dengan viewer native.
- **Cache Browser**: Jika tampilan belum berubah, coba tekan `Ctrl + F5` (Hard Refresh) di browser Bapak.

Sekarang Mandaapp sudah siap dengan tampilan PDF yang lebih profesional! 🚀
