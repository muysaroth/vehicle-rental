<?php

namespace App\Providers;

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Behind a reverse proxy / load balancer (Nginx, Cloudflare...), trust its
        // X-Forwarded-* headers so HTTPS and client IPs are detected correctly.
        // Read from config, not env(), so it still works after `php artisan config:cache`.
        TrustProxies::at(config('rental.trusted_proxies'));

        // When the site is published over HTTPS, generate https:// links even behind a proxy.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
