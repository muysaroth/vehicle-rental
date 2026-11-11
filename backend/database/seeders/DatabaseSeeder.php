<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Local / classroom (APP_ENV other than production): four demo accounts with
     * simple passwords and 12 months of demo data.
     *
     * Production: no demo data and no demo accounts -- only one administrator
     * (ADMIN_NAME / ADMIN_EMAIL in .env) with a random password, printed once.
     * Further staff accounts are created on the Users screen.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->production();

            return;
        }

        foreach ([
            ['Sok Dara', 'admin@rental.test', 'admin123', User::ROLE_ADMIN],
            ['Chan Sophea', 'manager@rental.test', 'manager123', User::ROLE_MANAGER],
            ['Kim Vanna', 'staff@rental.test', 'staff123', User::ROLE_STAFF],
            ['Lim Rotha', 'staff2@rental.test', 'staff123', User::ROLE_STAFF],
        ] as [$name, $email, $password, $role]) {
            User::updateOrCreate(['email' => $email], ['name' => $name, 'password' => $password, 'role' => $role, 'is_active' => true]);
        }

        $this->call(DemoDataSeeder::class);
    }

    private function production(): void
    {
        if (User::where('role', User::ROLE_ADMIN)->exists()) {
            $this->command?->info('An administrator already exists; nothing to seed.');

            return;
        }

        $email = config('rental.admin.email');
        $password = Str::password(16, symbols: false);

        User::create([
            'name' => config('rental.admin.name'),
            'email' => $email,
            'password' => $password,
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $this->command?->warn('Administrator created. Note the password now -- it is not shown again. Change it after the first sign-in.');
        $this->command?->table(['Email', 'Password'], [[$email, $password]]);
    }
}
