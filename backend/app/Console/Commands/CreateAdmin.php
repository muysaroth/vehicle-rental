<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Create an administrator, or reset an existing account's password and make it an
 * active administrator. The way back in if every admin password is forgotten.
 */
class CreateAdmin extends Command
{
    protected $signature = 'app:admin {email : The account email} {--name= : Name for a new account}';

    protected $description = 'Create an administrator, or reset an account to admin with a new random password';

    public function handle(): int
    {
        $email = $this->argument('email');
        $password = Str::password(16, symbols: false);

        $user = User::firstOrNew(['email' => $email]);
        $new = ! $user->exists;

        $user->fill([
            'name' => $this->option('name') ?: ($user->name ?: 'Administrator'),
            'password' => $password,
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ])->save();

        $user->tokens()->delete();

        $this->info($new ? 'Administrator created.' : 'Account reset to an active administrator; its other sessions were signed out.');
        $this->table(['Email', 'Password'], [[$email, $password]]);
        $this->warn('Note the password now -- it is not shown again.');

        return self::SUCCESS;
    }
}
