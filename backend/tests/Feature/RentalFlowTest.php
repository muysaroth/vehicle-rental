<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RentalFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-05-10 10:00:00');

        $this->staff = User::create(['name' => 'Staff', 'email' => 'staff@t', 'password' => 'secret1', 'role' => 'staff']);
        $this->customer = Customer::create(['name' => 'Sok Dara', 'phone' => '012 345 678']);
    }

    private function vehicle(array $overrides = []): Vehicle
    {
        return Vehicle::create($overrides + [
            'plate_no' => 'PP 2A-'.mt_rand(1000, 9999),
            'brand' => 'Toyota', 'model' => 'Camry', 'year' => 2022, 'type' => 'car', 'seats' => 5,
            'purpose' => 'rent', 'status' => 'available',
            'daily_rate' => 40, 'sale_price' => 20000, 'purchase_cost' => 22000,
        ]);
    }

    private function book(Vehicle $v, string $start, string $end, array $extra = [])
    {
        return $this->postJson('/api/bookings', $extra + [
            'customer_id' => $this->customer->id,
            'vehicle_id' => $v->id,
            'start_date' => $start,
            'end_date' => $end,
        ]);
    }

    public function test_a_booking_prices_the_days_inclusively_and_takes_the_deposit(): void
    {
        Sanctum::actingAs($this->staff);
        $car = $this->vehicle();

        $this->book($car, '2026-05-12', '2026-05-14', ['discount' => 10, 'deposit' => 50])
            ->assertCreated()
            ->assertJsonPath('days', 3)
            ->assertJsonPath('total', 110)
            ->assertJsonPath('paid', 50)
            ->assertJsonPath('balance', 60)
            ->assertJsonPath('status', 'reserved');

        $this->assertSame('reserved', $car->fresh()->status);
    }

    public function test_the_same_vehicle_cannot_be_double_booked(): void
    {
        Sanctum::actingAs($this->staff);
        $car = $this->vehicle();

        $this->book($car, '2026-05-12', '2026-05-14')->assertCreated();

        $this->book($car, '2026-05-14', '2026-05-16')->assertUnprocessable()->assertJsonValidationErrors('vehicle_id');
        $this->book($car, '2026-05-15', '2026-05-16')->assertCreated();

        $this->getJson('/api/vehicles/available?start_date=2026-05-13&end_date=2026-05-13')
            ->assertOk()->assertJsonCount(0);
    }

    public function test_pickup_and_late_return_charge_the_extra_days(): void
    {
        Sanctum::actingAs($this->staff);
        $car = $this->vehicle();

        $id = $this->book($car, '2026-05-08', '2026-05-09')->json('id');

        $this->postJson("/api/bookings/{$id}/pickup")->assertOk()->assertJsonPath('status', 'active');
        $this->assertSame('rented', $car->fresh()->status);

        // Due back on the 9th, returned on the 10th: one day late.
        $this->postJson("/api/bookings/{$id}/return", ['mileage' => 12345, 'payment_amount' => 120, 'payment_method' => 'cash'])
            ->assertOk()
            ->assertJsonPath('status', 'returned')
            ->assertJsonPath('late_fee', 40)
            ->assertJsonPath('total', 120)
            ->assertJsonPath('balance', 0);

        $this->assertSame('available', $car->fresh()->status);
        $this->assertSame(12345, $car->fresh()->mileage);
    }

    public function test_an_overdue_rental_keeps_blocking_the_vehicle(): void
    {
        Sanctum::actingAs($this->staff);
        $car = $this->vehicle();

        // Due back yesterday, still out.
        $id = $this->book($car, '2026-05-07', '2026-05-09')->json('id');
        $this->postJson("/api/bookings/{$id}/pickup")->assertOk();

        $this->book($car, '2026-05-10', '2026-05-11')->assertUnprocessable()->assertJsonValidationErrors('vehicle_id');
        $this->getJson('/api/vehicles/available?start_date=2026-05-10&end_date=2026-05-10')->assertOk()->assertJsonCount(0);

        // A booking further out is allowed -- the car is expected back by then.
        $this->book($car, '2026-05-20', '2026-05-21')->assertCreated();
    }

    public function test_a_booking_cannot_be_picked_up_before_it_starts(): void
    {
        Sanctum::actingAs($this->staff);
        $id = $this->book($this->vehicle(), '2026-05-20', '2026-05-21')->json('id');

        $this->postJson("/api/bookings/{$id}/pickup")->assertUnprocessable();
    }

    public function test_overpaying_a_booking_is_refused(): void
    {
        Sanctum::actingAs($this->staff);
        $id = $this->book($this->vehicle(), '2026-05-12', '2026-05-12')->json('id');

        $this->postJson("/api/bookings/{$id}/pay", ['amount' => 41, 'method' => 'cash'])->assertUnprocessable();
        $this->postJson("/api/bookings/{$id}/pay", ['amount' => 40, 'method' => 'bank'])->assertOk()->assertJsonPath('balance', 0);
    }

    public function test_cancelling_frees_the_vehicle(): void
    {
        Sanctum::actingAs($this->staff);
        $car = $this->vehicle();
        $id = $this->book($car, '2026-05-12', '2026-05-13')->json('id');

        $this->postJson("/api/bookings/{$id}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');
        $this->assertSame('available', $car->fresh()->status);
        $this->book($car, '2026-05-12', '2026-05-13')->assertCreated();
    }

    public function test_selling_a_vehicle_marks_it_sold_and_records_cost(): void
    {
        Sanctum::actingAs($this->staff);
        $car = $this->vehicle(['purpose' => 'sale', 'sale_price' => 25000, 'purchase_cost' => 21000]);

        $this->postJson('/api/sales', [
            'customer_id' => $this->customer->id,
            'vehicle_id' => $car->id,
            'sale_date' => '2026-05-10',
            'discount' => 500,
            'payment_method' => 'installment',
            'amount_paid' => 7000,
        ])->assertCreated()
            ->assertJsonPath('total', 24500)
            ->assertJsonPath('cost', 21000)
            ->assertJsonPath('balance', 17500);

        $this->assertSame('sold', $car->fresh()->status);

        // Cannot be sold twice, nor rented once sold.
        $this->postJson('/api/sales', [
            'customer_id' => $this->customer->id, 'vehicle_id' => $car->id,
            'sale_date' => '2026-05-10', 'payment_method' => 'cash',
        ])->assertUnprocessable();
    }

    public function test_a_rental_only_vehicle_cannot_be_sold(): void
    {
        Sanctum::actingAs($this->staff);

        $this->postJson('/api/sales', [
            'customer_id' => $this->customer->id, 'vehicle_id' => $this->vehicle()->id,
            'sale_date' => '2026-05-10', 'payment_method' => 'cash',
        ])->assertUnprocessable()->assertJsonValidationErrors('vehicle_id');
    }

    public function test_staff_cannot_reach_manager_screens(): void
    {
        Sanctum::actingAs($this->staff);

        $this->getJson('/api/reports/performance')->assertForbidden();
        $this->getJson('/api/expenses')->assertForbidden();
        $this->postJson('/api/vehicles', [])->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
    }

    public function test_the_performance_report_ranks_vehicle_types(): void
    {
        $manager = User::create(['name' => 'M', 'email' => 'm@t', 'password' => 'secret1', 'role' => 'manager']);
        $suv = $this->vehicle(['type' => 'suv', 'daily_rate' => 90, 'purchase_cost' => 40000, 'purchased_on' => '2026-01-01']);
        $car = $this->vehicle(['purchased_on' => '2026-01-01']);

        foreach ([[$suv, 10, 900], [$car, 3, 120]] as [$v, $days, $total]) {
            Booking::create([
                'booking_no' => Booking::nextNumber(), 'customer_id' => $this->customer->id, 'vehicle_id' => $v->id,
                'user_id' => $manager->id, 'start_date' => '2026-03-01', 'end_date' => '2026-03-'.str_pad((string) $days, 2, '0', STR_PAD_LEFT),
                'days' => $days, 'daily_rate' => $v->daily_rate, 'total' => $total, 'status' => 'returned',
            ]);
        }

        Sanctum::actingAs($manager);

        $report = $this->getJson('/api/reports/performance?from=2026-03-01&to=2026-03-31')->assertOk();

        $this->assertSame('suv', $report->json('recommendation.best'));
        $this->assertEquals(1020, $report->json('totals.rental_revenue'));
        $suvRow = collect($report->json('types'))->firstWhere('type', 'suv');
        $this->assertEqualsWithDelta(10 / 31, $suvRow['utilization'], 0.001);
    }

    public function test_login_returns_a_token(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'staff@t', 'password' => 'wrong'])->assertUnprocessable();

        $token = $this->postJson('/api/auth/login', ['email' => 'staff@t', 'password' => 'secret1'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/auth/me')->assertOk()->assertJsonPath('role', 'staff');
    }
}
