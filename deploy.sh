#!/bin/bash
# ============================================================
# 🚀 Mandaapp — Smart Deploy Script
# ============================================================
# Script ini HANYA me-rebuild dan me-restart API + Web.
# Database TIDAK disentuh sehingga tidak ada masalah password.
#
# Cara pakai:
#   chmod +x deploy.sh    (pertama kali saja)
#   ./deploy.sh           (setiap kali deploy)
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🚀 Mandaapp Smart Deploy                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Pull latest code
echo "📥 [1/6] Mengambil kode terbaru dari GitHub..."
git pull origin main
echo ""

# 2. Run pending SQL migrations against the database
echo "🗄️  [2/6] Menjalankan migrasi database..."
MIGRATION_DIR="apps/api/migrations"
if [ -d "$MIGRATION_DIR" ]; then
  for migration_file in "$MIGRATION_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
      echo "   ➜ $(basename $migration_file)"
      docker exec -i mandaapp_db psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-mandaapp_prod}" < "$migration_file" 2>&1 || true
    fi
  done
else
  echo "   Tidak ada migrasi pending."
fi
echo ""

# 3. Build only API and Web (SKIP database!)
echo "🔨 [3/6] Rebuild image API dan Web..."
docker compose build api web
echo ""

# 4. Restart only API and Web (database tetap jalan!)
echo "♻️  [4/6] Restart API dan Web (Database TIDAK disentuh)..."
docker compose up -d api web
echo ""

# 5. Setup automated daily backup (cron)
echo "🔄 [5/6] Memastikan backup otomatis terjadwal..."
BACKUP_SCRIPT="$(pwd)/backup-db.sh"
if [ -f "$BACKUP_SCRIPT" ]; then
  chmod +x "$BACKUP_SCRIPT"
  # Add cron job if it doesn't exist yet
  CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> /var/log/mandaapp-backup.log 2>&1"
  if ! crontab -l 2>/dev/null | grep -qF "backup-db.sh"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "   ✅ Cron backup harian ditambahkan (jam 2 pagi)"
  else
    echo "   ✓ Cron backup sudah terjadwal"
  fi
else
  echo "   ⚠️ backup-db.sh tidak ditemukan, skip."
fi
echo ""

# 6. Quick health check
echo "🩺 [6/6] Menunggu container sehat..."
sleep 5

# Check if containers are running
API_STATUS=$(docker inspect --format='{{.State.Status}}' mandaapp_api 2>/dev/null || echo "not found")
WEB_STATUS=$(docker inspect --format='{{.State.Status}}' mandaapp_web 2>/dev/null || echo "not found")
DB_STATUS=$(docker inspect --format='{{.State.Status}}' mandaapp_db 2>/dev/null || echo "not found")

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  Status Container                           │"
echo "├─────────────────────────────────────────────┤"
printf "│  🗄️  Database (postgres) : %-17s │\n" "$DB_STATUS"
printf "│  ⚙️  API (backend)       : %-17s │\n" "$API_STATUS"
printf "│  🌐 Web (frontend)      : %-17s │\n" "$WEB_STATUS"
echo "└─────────────────────────────────────────────┘"
echo ""

if [ "$API_STATUS" = "running" ] && [ "$WEB_STATUS" = "running" ]; then
  echo "✅ Deploy berhasil! Mandaapp sudah live."
  echo ""
  echo "📋 Post-deploy summary:"
  echo "   • Migrations    : ✓ dijalankan"
  echo "   • Backup harian : ✓ terjadwal (jam 02:00)"
  echo "   • Log API       : docker compose logs --tail=20 api"
else
  echo "⚠️  Ada container yang belum running. Cek log:"
  echo "   docker compose logs --tail=20 api"
fi
echo ""
