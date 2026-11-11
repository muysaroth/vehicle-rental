<?php

/*
 * Settings specific to the rental business. All values come from .env so a
 * deployment can set them without touching code.
 */
return [

    // Printed at the top of invoices and rental contracts.
    'company' => [
        'name' => env('COMPANY_NAME', 'Mekong Wheels'),
        'address' => env('COMPANY_ADDRESS', 'Phnom Penh, Cambodia'),
        'phone' => env('COMPANY_PHONE', ''),
        'email' => env('COMPANY_EMAIL', ''),
        'tax_id' => env('COMPANY_TAX_ID', ''),
    ],

    // `php artisan backup:run` (scheduled daily, see routes/console.php).
    'backup' => [
        'path' => env('BACKUP_PATH', storage_path('app/backups')),
        // How many backup files to keep; older ones are deleted.
        'keep' => (int) env('BACKUP_KEEP', 30),
        // Time of day for the scheduled backup (24h, server time zone).
        'at' => env('BACKUP_AT', '01:30'),
        // MySQL only: path to mysqldump if it is not on the PATH.
        'mysqldump' => env('BACKUP_MYSQLDUMP', 'mysqldump'),
    ],

    // Reverse proxies whose X-Forwarded-* headers are trusted: comma separated IPs, or *.
    'trusted_proxies' => env('TRUSTED_PROXIES', '127.0.0.1'),

    // The first administrator created by `php artisan db:seed` in production.
    'admin' => [
        'name' => env('ADMIN_NAME', 'Administrator'),
        'email' => env('ADMIN_EMAIL', 'admin@example.com'),
    ],
];
