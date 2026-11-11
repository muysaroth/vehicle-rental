<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Demo accounts. The simple passwords are for the classroom demo only. In production
     * (APP_ENV=production) each account gets a random password, printed once below.
     */
    public function run(): void
    {
        $production = app()->isProduction();
        $issued = [];

        foreach ([
            ['Sok Dara', 'admin@rental.test', 'admin123', User::ROLE_ADMIN],
            ['Chan Sophea', 'manager@rental.test', 'manager123', User::ROLE_MANAGER],
            ['Kim Vanna', 'staff@rental.test', 'staff123', User::ROLE_STAFF],
            ['Lim Rotha', 'staff2@rental.test', 'staff123', User::ROLE_STAFF],
        ] as [$name, $email, $password, $role]) {
            if ($production) {
                $password = Str::password(14, symbols: false);
                $issued[] = [$email, $password];
            }
            User::updateOrCreate(['email' => $email], ['name' => $name, 'password' => $password, 'role' => $role, 'is_active' => true]);
        }

        if ($issued) {
            $this->command?->warn('Production: random passwords issued. Note them now -- they are not shown again.');
            $this->command?->table(['Email', 'Password'], $issued);
        }

        $this->call(DemoDataSeeder::class);
    }
}
