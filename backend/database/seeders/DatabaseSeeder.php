<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Demo accounts. These passwords are for the classroom demo only --
     * change them (Users screen) before the system holds real data.
     */
    public function run(): void
    {
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
}
