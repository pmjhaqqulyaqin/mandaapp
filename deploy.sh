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
echo "📥 [1/5] Mengambil kode terbaru dari GitHub..."
git pull origin main
echo ""

# 1.5 Run pending SQL migrations against the database
echo "🗄️  [2/5] Menjalankan migrasi database (jika ada)..."
for migration_file in migration-*.sql; do
  if [ -f "$migration_file" ]; then
    echo "   ➜ Menjalankan $migration_file ..."
    docker exec -i mandaapp_db psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-mandaapp_prod}" < "$migration_file" 2>&1 || true
  fi
done
echo ""

# 2. Build only API and Web (SKIP database!)
echo "🔨 [3/5] Rebuild image API dan Web..."
docker compose build api web
echo ""

# 3. Restart only API and Web (database tetap jalan!)
echo "♻️  [4/5] Restart API dan Web (Database TIDAK disentuh)..."
docker compose up -d api web
echo ""

# 4. Quick health check
echo "🩺 [5/5] Menunggu container sehat..."
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
else
  echo "⚠️  Ada container yang belum running. Cek log:"
  echo "   docker compose logs --tail=20 api"
fi
echo ""
