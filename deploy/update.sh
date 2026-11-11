#!/usr/bin/env bash
# Install or update the app on a Linux server (run from the repository root).
#   First time: create backend/.env from backend/.env.production.example first.
#   Usage:      ./deploy/update.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "==> Back up the database before changing anything"
if [ -f backend/.env ] && [ -d backend/vendor ]; then
    (cd backend && php artisan backup:run) || echo "   (no database yet, skipping)"
fi

echo "==> Get the latest code"
git pull --ff-only

echo "==> Back end"
cd "$ROOT/backend"
composer install --no-dev --optimize-autoloader --no-interaction
grep -q '^APP_KEY=base64' .env || php artisan key:generate --force
if grep -q '^DB_CONNECTION=sqlite' .env && [ ! -f database/database.sqlite ]; then
    touch database/database.sqlite
fi
php artisan migrate --force
php artisan config:cache
php artisan route:cache

echo "==> Front end (demo-account buttons hidden)"
cd "$ROOT/frontend"
npm ci
VITE_DEMO_ACCOUNTS=false npm run build

echo "==> Permissions: the web server writes to storage/ and the database"
cd "$ROOT/backend"
chown -R www-data:www-data storage bootstrap/cache database 2>/dev/null || echo "   (run as root to fix ownership)"

echo "Done. First install only: php artisan db:seed --force   (creates the admin and prints its password)"
