<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductionReadinessTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create(['name' => 'Admin', 'email' => 'admin@t', 'password' => 'admin-pass-1', 'role' => 'admin']);
        $this->staff = User::create(['name' => 'Staff', 'email' => 'staff@t', 'password' => 'staff-pass-1', 'role' => 'staff']);
    }

    private function call_as(string $token, string $method, string $uri, array $data = [])
    {
        // Forget the user resolved by the previous request so each call authenticates afresh.
        $this->app['auth']->forgetGuards();

        return $this->withToken($token)->json($method, $uri, $data);
    }

    /* ------------------------------------------------------------ Password */

    public function test_a_user_can_change_their_own_password_and_other_sessions_end(): void
    {
        $here = $this->staff->createToken('here')->plainTextToken;
        $elsewhere = $this->staff->createToken('elsewhere')->plainTextToken;

        $this->call_as($here, 'PUT', '/api/auth/password', [
            'current_password' => 'staff-pass-1',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])->assertOk();

        $this->call_as($here, 'GET', '/api/auth/me')->assertOk();
        $this->call_as($elsewhere, 'GET', '/api/auth/me')->assertUnauthorized();

        $this->postJson('/api/auth/login', ['email' => 'staff@t', 'password' => 'brand-new-pass'])->assertOk();
        $this->assertDatabaseHas('activity_logs', ['user_id' => $this->staff->id, 'action' => 'password']);
    }

    public function test_changing_password_needs_the_current_one_and_a_long_enough_new_one(): void
    {
        Sanctum::actingAs($this->staff);

        $this->putJson('/api/auth/password', [
            'current_password' => 'wrong',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])->assertJsonValidationErrors('current_password');

        $this->putJson('/api/auth/password', [
            'current_password' => 'staff-pass-1',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertJsonValidationErrors('password');
    }

    /* ------------------------------------------------------ Disabled users */

    public function test_disabling_an_account_ends_its_sessions(): void
    {
        $token = $this->staff->createToken('web')->plainTextToken;
        $this->call_as($token, 'GET', '/api/dashboard')->assertOk();

        Sanctum::actingAs($this->admin);
        $this->putJson("/api/users/{$this->staff->id}", ['is_active' => false])->assertOk();

        $this->call_as($token, 'GET', '/api/dashboard')->assertUnauthorized();
    }

    public function test_a_disabled_user_holding_an_old_token_is_refused(): void
    {
        $token = $this->staff->createToken('web')->plainTextToken;
        // Disabled directly in the database, bypassing the controller's token clean-up.
        DB::table('users')->where('id', $this->staff->id)->update(['is_active' => false]);

        $this->call_as($token, 'GET', '/api/dashboard')->assertUnauthorized();
    }

    /* ----------------------------------------------------------- Audit log */

    public function test_changes_are_recorded_in_the_audit_log(): void
    {
        Sanctum::actingAs($this->staff);

        $id = $this->postJson('/api/customers', ['name' => 'Sok Dara', 'phone' => '012 111 222'])->assertCreated()->json('id');
        $this->putJson("/api/customers/{$id}", ['name' => 'Sok Dara', 'phone' => '012 999 888'])->assertOk();

        $created = ActivityLog::where('action', 'created')->where('subject_type', 'Customer')->first();
        $this->assertSame($this->staff->id, $created->user_id);
        $this->assertSame('Sok Dara · 012 111 222', $created->subject_label);

        $updated = ActivityLog::where('action', 'updated')->where('subject_id', $id)->first();
        $this->assertSame(['phone' => ['012 111 222', '012 999 888']], $updated->changes);
    }

    public function test_the_audit_log_never_stores_passwords(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/users', ['name' => 'New', 'email' => 'new@t', 'password' => 'secret-pass-9', 'role' => 'staff'])->assertCreated();

        $log = ActivityLog::where('subject_type', 'User')->where('action', 'created')->firstOrFail();
        $this->assertArrayNotHasKey('password', $log->changes);
        $this->assertStringNotContainsString('secret-pass-9', json_encode($log->changes));
    }

    public function test_seeding_without_a_signed_in_user_writes_no_audit_rows(): void
    {
        Customer::create(['name' => 'Seeded', 'phone' => '1']);

        $this->assertSame(0, ActivityLog::count());
    }

    public function test_only_admins_can_read_the_audit_log(): void
    {
        Sanctum::actingAs($this->staff);
        $this->getJson('/api/activity')->assertForbidden();

        Sanctum::actingAs($this->admin);
        Customer::create(['name' => 'Logged', 'phone' => '1']);
        $this->getJson('/api/activity?subject_type=Customer')->assertOk()->assertJsonPath('data.0.subject_label', 'Logged · 1');
    }

    public function test_sign_in_is_recorded(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'admin@t', 'password' => 'admin-pass-1'])->assertOk();

        $this->assertDatabaseHas('activity_logs', ['user_id' => $this->admin->id, 'action' => 'login']);
    }

    /* --------------------------------------------------- Invoices / company */

    public function test_company_details_for_printing_come_from_config(): void
    {
        config(['rental.company.name' => 'Test Motors']);
        Sanctum::actingAs($this->staff);

        $this->getJson('/api/company')->assertOk()->assertJsonPath('name', 'Test Motors');
    }

    /* ------------------------------------------------------------- Backups */

    public function test_backup_copies_the_database_and_prunes_old_copies(): void
    {
        $dir = storage_path('framework/testing/backups-'.uniqid());
        $db = $dir.'/source.sqlite';
        File::ensureDirectoryExists($dir);
        touch($db);

        config([
            'database.connections.backup_source' => ['driver' => 'sqlite', 'database' => $db, 'prefix' => '', 'foreign_key_constraints' => true],
            'rental.backup.path' => $dir.'/out',
        ]);
        DB::connection('backup_source')->statement('create table things (name text)');
        DB::connection('backup_source')->table('things')->insert(['name' => 'kept']);

        // An older backup that should be pruned with --keep=1.
        File::ensureDirectoryExists($dir.'/out');
        File::put($dir.'/out/db-20200101-000000.sqlite', 'old');

        $default = config('database.default');
        config(['database.default' => 'backup_source']);
        try {
            $this->assertSame(0, Artisan::call('backup:run', ['--keep' => 1]));
        } finally {
            config(['database.default' => $default]);
        }

        $files = File::files($dir.'/out');
        $this->assertCount(1, $files);
        $this->assertNotSame('db-20200101-000000.sqlite', $files[0]->getFilename());

        // The copy is a real, readable database.
        config(['database.connections.backup_copy' => ['driver' => 'sqlite', 'database' => $files[0]->getPathname(), 'prefix' => '']]);
        $this->assertSame('kept', DB::connection('backup_copy')->table('things')->value('name'));

        DB::purge('backup_source');
        DB::purge('backup_copy');
        File::deleteDirectory($dir);
    }

    public function test_backups_are_scheduled_daily(): void
    {
        Artisan::call('schedule:list');

        $this->assertStringContainsString('backup:run', Artisan::output());
    }

    /* ---------------------------------------------------------- Production */

    public function test_production_seeding_creates_one_admin_and_no_demo_data(): void
    {
        User::query()->delete();
        $this->app['env'] = 'production';
        config(['rental.admin.email' => 'owner@company.com']);

        $this->artisan('db:seed', ['--force' => true])->assertSuccessful();

        $this->assertSame(['owner@company.com'], User::pluck('email')->all());
        $this->assertSame('admin', User::first()->role);
        $this->assertSame(0, Vehicle::count());
        $this->assertSame(0, Customer::count());
    }

    public function test_responses_carry_security_headers(): void
    {
        $this->get('/up')->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    public function test_the_admin_command_resets_access(): void
    {
        $this->artisan('app:admin', ['email' => 'staff@t'])->assertSuccessful();

        $this->assertSame('admin', $this->staff->fresh()->role);
    }
}
