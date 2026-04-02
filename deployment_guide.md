# Panduan Deploy Mandaapp (Docker VPS)

## 🚀 Deploy Cepat (Cara Paling Aman)

Gunakan script otomatis yang sudah disediakan:

```bash
cd ~/mandaapp
./deploy.sh
```

> Script ini hanya me-rebuild API + Web. **Database TIDAK dimatikan** sehingga tidak ada masalah password.

### Pertama kali Setup Script:
```bash
chmod +x deploy.sh
```

---

## 📋 Manual Deploy (Langkah per Langkah)

Jika ingin manual, ikuti langkah ini:

```bash
cd ~/mandaapp
git pull origin main
docker compose build api web
docker compose up -d api web
```

> [!CAUTION]
> **JANGAN gunakan `docker compose down`** kecuali benar-benar perlu (misal: mengubah konfigurasi database).
> Perintah `down` mematikan database dan menyebabkan masalah password authentication.

---

## 🔧 Jika Terpaksa Harus Restart Database

Hanya gunakan ini jika ada masalah berat pada database:

```bash
docker compose down
docker compose up -d
# Tunggu 10 detik, lalu fix password:
docker exec -it mandaapp_db psql -U postgres -d mandaapp_prod -c "ALTER USER postgres WITH PASSWORD 'postgres';"
docker compose restart api
```

---

## 🩺 Troubleshooting

### Website Loading Terus (Tidak Muncul)
```bash
# Cek log API:
docker compose logs --tail=30 api

# Jika ada "password authentication failed":
docker exec -it mandaapp_db psql -U postgres -d mandaapp_prod -c "ALTER USER postgres WITH PASSWORD 'postgres';"
docker compose restart api
```

### Cek Status Container
```bash
docker compose ps
```

### Cache Browser
Tekan `Ctrl + F5` (Hard Refresh) jika tampilan belum berubah.
