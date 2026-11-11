# Container image for the Laravel API (used by Railway; works on any Docker host).
# FrankenPHP is PHP plus a production web server (Caddy) in one image.
FROM dunglas/frankenphp:1-php8.4

# The base image already has every extension the app needs (pdo_sqlite,
# mbstring, opcache...). Switching to MySQL? Add: RUN install-php-extensions pdo_mysql
# unzip: lets Composer unpack packages.
RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip \
 && rm -rf /var/lib/apt/lists/* \
 && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies first, so code-only changes reuse this layer.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-interaction \
 && sed -i 's/\r$//' docker/start.sh \
 && chmod +x docker/start.sh

CMD ["docker/start.sh"]
