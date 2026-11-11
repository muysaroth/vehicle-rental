<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

/**
 * Copy the database to storage/app/backups (or BACKUP_PATH) and keep the newest
 * BACKUP_KEEP copies. Runs daily through the scheduler; also safe to run by hand.
 *
 *   SQLite -> a consistent copy made with VACUUM INTO (safe while the app is in use)
 *   MySQL  -> an SQL dump made with mysqldump --single-transaction
 */
class BackupDatabase extends Command
{
    protected $signature = 'backup:run {--keep= : How many backups to keep (default BACKUP_KEEP)}';

    protected $description = 'Back up the database and delete old backups';

    public function handle(): int
    {
        $dir = config('rental.backup.path');
        File::ensureDirectoryExists($dir);

        $connection = DB::connection();
        $driver = $connection->getDriverName();
        $stamp = now()->format('Ymd-His');

        try {
            $file = match ($driver) {
                'sqlite' => $this->sqlite($connection, "{$dir}/db-{$stamp}.sqlite"),
                'mysql', 'mariadb' => $this->mysql($connection->getConfig(), "{$dir}/db-{$stamp}.sql"),
                default => throw new \RuntimeException("Backups are not supported for the {$driver} driver."),
            };
        } catch (\Throwable $e) {
            $this->error('Backup failed: '.$e->getMessage());
            report($e);

            return self::FAILURE;
        }

        $this->info(sprintf('Backup written: %s (%s KB)', $file, number_format(filesize($file) / 1024)));
        $this->prune($dir, (int) ($this->option('keep') ?? config('rental.backup.keep')));

        return self::SUCCESS;
    }

    private function sqlite($connection, string $file): string
    {
        $source = $connection->getConfig('database');
        if ($source === ':memory:') {
            throw new \RuntimeException('The in-memory database cannot be backed up.');
        }

        $connection->statement('VACUUM INTO ?', [$file]);

        return $file;
    }

    private function mysql(array $config, string $file): string
    {
        $process = new Process([
            config('rental.backup.mysqldump'),
            '--host='.$config['host'],
            '--port='.$config['port'],
            '--user='.$config['username'],
            '--single-transaction',
            '--routines',
            '--default-character-set=utf8mb4',
            '--result-file='.$file,
            $config['database'],
        ], null, ['MYSQL_PWD' => (string) $config['password']]);

        $process->setTimeout(600)->mustRun();

        return $file;
    }

    private function prune(string $dir, int $keep): void
    {
        if ($keep < 1) {
            return;
        }

        $old = collect(File::files($dir))
            ->filter(fn ($f) => preg_match('/^db-\d{8}-\d{6}\.(sqlite|sql)$/', $f->getFilename()))
            ->sortByDesc(fn ($f) => $f->getFilename())
            ->slice($keep);

        foreach ($old as $f) {
            File::delete($f->getPathname());
            $this->line('Deleted old backup '.$f->getFilename());
        }
    }
}
