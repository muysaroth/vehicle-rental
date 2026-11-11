#!/bin/sh
# Container start-up: prepare the database, cache config, start the scheduler,
# then serve public/ on $PORT. The SQLite file and backups live on the volume
# mounted at /data, so they survive redeploys; everything else is rebuilt.
set -e

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ] && [ -n "$DB_DATABASE" ]; then
    mkdir -p "$(dirname "$DB_DATABASE")"
    [ -f "$DB_DATABASE" ] || touch "$DB_DATABASE"
fi
[ -n "$BACKUP_PATH" ] && mkdir -p "$BACKUP_PATH"

php artisan migrate --force
# First boot only: creates the administrator (ADMIN_EMAIL) and prints its random
# password to the deploy log. Does nothing once an administrator exists.
php artisan db:seed --force
# Not `optimize`: it also caches Blade views, and this API has none.
php artisan config:cache
php artisan route:cache
php artisan event:cache

# Daily backup and expired-token cleanup (routes/console.php).
php artisan schedule:work &

exec frankenphp php-server --listen ":${PORT:-8080}" --root public
