<?php

use Illuminate\Support\Facades\Schedule;

/*
 * Scheduled tasks. They run when the server calls `php artisan schedule:run`
 * every minute (cron on Linux, Task Scheduler on Windows) -- see docs/06-deployment.md.
 */

// Daily database backup; keeps the newest BACKUP_KEEP copies.
Schedule::command('backup:run')->dailyAt(config('rental.backup.at'))->withoutOverlapping();

// Remove expired login tokens.
Schedule::command('sanctum:prune-expired --hours=24')->daily();
