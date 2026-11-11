<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Twelve months of trading for "Mekong Wheels Co., Ltd.", a fictional vehicle
 * sales & rental company in Phnom Penh -- the simulated company the assignment
 * analyses.
 *
 * Demand is shaped to look like the real market: busy around Khmer New Year
 * (April), Pchum Ben (Sep/Oct) and the Water Festival (Nov), quiet in the
 * rainy months. Seeded RNG, so every run produces the same books.
 */
class DemoDataSeeder extends Seeder
{
    private const FMT = 'Y-m-d H:i:s';

    /** Average rental length (days) and target utilisation by type. */
    private const DEMAND = [
        'car' => ['len' => [1, 5], 'util' => 0.55],
        'suv' => ['len' => [2, 6], 'util' => 0.74],
        'van' => ['len' => [1, 4], 'util' => 0.58],
        'pickup' => ['len' => [2, 7], 'util' => 0.42],
        'motorbike' => ['len' => [1, 7], 'util' => 0.50],
    ];

    /** Seasonal demand multiplier by month (1 = Jan). */
    private const SEASON = [1 => 1.0, 2 => 0.9, 3 => 1.0, 4 => 1.45, 5 => 0.9, 6 => 0.8, 7 => 0.75, 8 => 0.8, 9 => 1.2, 10 => 1.3, 11 => 1.25, 12 => 1.15];

    private array $staff;

    private array $customers = [];

    private int $workshopId = 0;

    public function run(): void
    {
        mt_srand(2026);

        if (DB::table('vehicles')->exists()) {
            $this->command?->warn('Demo data already present -- skipped. Use `php artisan migrate:fresh --seed` to rebuild.');

            return;
        }

        $this->staff = User::pluck('id')->all();
        $today = Carbon::today();
        $start = $today->copy()->subMonthsNoOverflow(12)->startOfMonth();

        DB::transaction(function () use ($today, $start) {
            $this->seedCustomers();
            $fleet = $this->seedFleet($start);
            $this->seedBookings($fleet, $start, $today);
            $this->seedSales($start, $today);
            $this->seedExpenses($fleet, $start, $today);
        });
    }

    private function seedCustomers(): void
    {
        $family = ['Sok', 'Chan', 'Kim', 'Lim', 'Heng', 'Chea', 'Seng', 'Ly', 'Meas', 'Keo', 'Phan', 'Ouk', 'Nhem', 'Pich', 'Hun', 'Tep', 'Chhay', 'Ros', 'Mao', 'Yim'];
        $given = ['Dara', 'Sophea', 'Vanna', 'Rotha', 'Bopha', 'Sokha', 'Piseth', 'Sreymom', 'Vichea', 'Chenda', 'Kosal', 'Nary', 'Rithy', 'Sothea', 'Malis', 'Visal', 'Leakhena', 'Sambath', 'Pheaktra', 'Davy', 'Ratanak', 'Sreyneang'];
        $areas = ['Daun Penh', 'Chamkar Mon', '7 Makara', 'Toul Kork', 'Sen Sok', 'Chbar Ampov', 'Mean Chey', 'Russey Keo', 'Por Senchey', 'Siem Reap', 'Battambang', 'Kampot'];
        $prefix = ['012', '015', '016', '017', '070', '077', '078', '085', '089', '092', '096', '097', '098'];

        // A handful of companies rent a lot -- the key accounts a manager watches.
        $companies = ['Angkor Tours Co.', 'Mekong Logistics', 'Sunrise Events', 'Royal Wedding Planner', 'NGO Green Cambodia', 'Phnom Penh Film Crew'];

        $now = now()->format(self::FMT);
        $used = [];

        for ($i = 0; $i < 84; $i++) {
            do {
                $name = $i < count($companies)
                    ? $companies[$i]
                    : $family[mt_rand(0, count($family) - 1)].' '.$given[mt_rand(0, count($given) - 1)];
            } while (isset($used[$name]));
            $used[$name] = true;

            $id = DB::table('customers')->insertGetId([
                'name' => $name,
                'phone' => $prefix[mt_rand(0, count($prefix) - 1)].' '.mt_rand(100, 999).' '.mt_rand(100, 999),
                'email' => mt_rand(0, 2) === 0 ? strtolower(str_replace([' ', '.'], ['.', ''], $name)).'@example.com' : null,
                'id_card_no' => $i < count($companies) ? null : (string) mt_rand(100000000, 999999999),
                'license_no' => mt_rand(0, 3) ? 'KH-'.mt_rand(1000000, 9999999) : null,
                'address' => $areas[mt_rand(0, count($areas) - 1)].($i < count($companies) ? '' : ', Phnom Penh'),
                'notes' => $i < count($companies) ? 'Corporate account' : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Corporate accounts are picked far more often.
            $this->customers = array_merge($this->customers, array_fill(0, $i < count($companies) ? 6 : 1, $id));
        }
    }

    /** @return array<int, array{id:int, type:string, rate:float, purchased:Carbon, purpose:string}> */
    private function seedFleet(Carbon $start): array
    {
        // [brand, model, type, seats, daily rate, purchase cost, how many]
        $models = [
            ['Toyota', 'Camry', 'car', 5, 45, 24000, 3],
            ['Toyota', 'Corolla Altis', 'car', 5, 38, 19500, 3],
            ['Honda', 'Civic', 'car', 5, 40, 21000, 2],
            ['Hyundai', 'Elantra', 'car', 5, 35, 17500, 2],
            ['Toyota', 'Fortuner', 'suv', 7, 85, 42000, 3],
            ['Lexus', 'RX 350', 'suv', 5, 110, 58000, 2],
            ['Ford', 'Everest', 'suv', 7, 80, 39000, 2],
            ['Toyota', 'Hiace Commuter', 'van', 15, 95, 36000, 2],
            ['Hyundai', 'Staria', 'van', 11, 90, 34000, 2],
            ['Ford', 'Ranger', 'pickup', 5, 60, 30000, 2],
            ['Toyota', 'Hilux Revo', 'pickup', 5, 58, 28500, 2],
            ['Honda', 'Dream 125', 'motorbike', 2, 8, 2100, 4],
            ['Honda', 'Scoopy', 'motorbike', 2, 9, 1950, 3],
            ['Honda', 'Click 160', 'motorbike', 2, 11, 2600, 3],
            ['Yamaha', 'NMAX', 'motorbike', 2, 14, 3300, 2],
        ];
        $colors = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Pearl White'];
        $provinces = ['PP', 'PP', 'PP', 'SR', 'BB'];

        $fleet = [];
        $plate = 1000;
        $now = now()->format(self::FMT);

        foreach ($models as [$brand, $model, $type, $seats, $rate, $cost, $count]) {
            for ($n = 0; $n < $count; $n++) {
                // Most of the fleet predates the year under study; a few were bought during it.
                $purchased = mt_rand(0, 4) === 0
                    ? $start->copy()->addDays(mt_rand(20, 200))
                    : $start->copy()->subDays(mt_rand(60, 900));
                $age = max(0, $start->year - $purchased->year);
                $plate += mt_rand(7, 91);

                $id = DB::table('vehicles')->insertGetId([
                    'plate_no' => $provinces[mt_rand(0, 4)].' '.($type === 'motorbike' ? '1'.chr(65 + mt_rand(0, 25)) : '2'.chr(65 + mt_rand(0, 25))).'-'.$plate,
                    'brand' => $brand,
                    'model' => $model,
                    'year' => $purchased->year - mt_rand(0, 1),
                    'type' => $type,
                    'color' => $colors[mt_rand(0, count($colors) - 1)],
                    'seats' => $seats,
                    'purpose' => 'rent',
                    'status' => 'available',
                    'daily_rate' => $rate,
                    'sale_price' => round($cost * (0.85 - 0.08 * $age), -2),
                    'purchase_cost' => $cost,
                    'purchased_on' => $purchased->format(self::FMT),
                    'mileage' => $type === 'motorbike' ? mt_rand(2000, 18000) : mt_rand(8000, 85000),
                    'notes' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $fleet[] = ['id' => $id, 'type' => $type, 'rate' => (float) $rate, 'purchased' => $purchased, 'purpose' => 'rent'];
            }
        }

        return $fleet;
    }

    private function seedBookings(array $fleet, Carbon $start, Carbon $today): void
    {
        $rows = [];
        $this->workshopId = $fleet[count($fleet) - 17]['id'];

        foreach ($fleet as $v) {
            $demand = self::DEMAND[$v['type']];
            [$minLen, $maxLen] = $demand['len'];
            $meanLen = ($minLen + $maxLen) / 2;

            $day = $v['purchased']->greaterThan($start) ? $v['purchased']->copy() : $start->copy();
            $horizon = $today->copy()->addDays(10);

            while ($day->lte($horizon)) {
                $util = min(0.95, $demand['util'] * self::SEASON[$day->month]);
                // Mean idle gap that yields the target utilisation.
                $meanGap = $meanLen * (1 - $util) / $util;
                $day->addDays((int) round(-log(max(1e-6, mt_rand(1, 10000) / 10000)) * $meanGap));

                if ($day->gt($horizon)) {
                    break;
                }

                $len = mt_rand($minLen, $maxLen);
                $begin = $day->copy();
                $end = $day->copy()->addDays($len - 1);
                $day = $end->copy()->addDay();

                // Bookings in the future that are not near-term reservations are dropped.
                if ($begin->gt($today) && $begin->diffInDays($today) > 7) {
                    continue;
                }

                // The workshop car has been off the road for the last few days.
                if ($v['id'] === $this->workshopId && $end->gte($today->copy()->subDays(4))) {
                    continue;
                }

                $rows[] = ['vehicle' => $v, 'start' => $begin, 'end' => $end, 'days' => $len];
            }
        }

        usort($rows, fn ($a, $b) => [$a['start'], $a['vehicle']['id']] <=> [$b['start'], $b['vehicle']['id']]);

        $seq = 0;
        $overdueMade = 0;

        foreach ($rows as $r) {
            $seq++;
            $v = $r['vehicle'];
            $rate = $v['rate'];
            $gross = $r['days'] * $rate;
            // Longer hires and corporate customers get a discount.
            $customer = $this->customers[mt_rand(0, count($this->customers) - 1)];
            $discount = $r['days'] >= 5 ? round($gross * 0.1, 2) : (mt_rand(0, 9) === 0 ? round($gross * 0.05, 2) : 0);
            $user = $this->staff[mt_rand(0, count($this->staff) - 1)];
            $created = $r['start']->copy()->subDays(mt_rand(0, 10))->setTime(mt_rand(8, 17), mt_rand(0, 59));

            $lateFee = 0;
            $pickedUp = null;
            $returned = null;

            // The last hire before today of a vehicle with nothing else on
            // the books yet: left un-returned, so the dashboard has an overdue
            // rental to flag.
            $overdue = $overdueMade < 2
                && $r['end']->lt($today) && $r['end']->gte($today->copy()->subDays(3))
                && ! $this->hasLaterStart($rows, $v['id'], $r['start'], $today);

            if ($r['start']->gt($today) || ($r['start']->eq($today) && mt_rand(0, 1) === 0)) {
                $status = 'reserved';
            } elseif ($r['end']->gte($today) || $overdue) {
                $status = 'active';
                $pickedUp = $r['start']->copy()->setTime(9, mt_rand(0, 59));
                if ($overdue) {
                    $overdueMade++;
                }
            } elseif (mt_rand(1, 100) <= 6) {
                $status = 'cancelled';
            } else {
                $status = 'returned';
                $pickedUp = $r['start']->copy()->setTime(mt_rand(8, 11), mt_rand(0, 59));
                $returned = $r['end']->copy()->setTime(mt_rand(15, 19), mt_rand(0, 59));
                if (mt_rand(1, 100) <= 7) {
                    $lateFee = $rate;
                    $returned->addDay();
                }
            }

            $total = round($gross - $discount + $lateFee, 2);
            $deposit = in_array($status, ['cancelled'], true) ? 0 : round($total * 0.3, 0);

            $id = DB::table('bookings')->insertGetId([
                'booking_no' => 'BK'.str_pad((string) $seq, 6, '0', STR_PAD_LEFT),
                'customer_id' => $customer,
                'vehicle_id' => $v['id'],
                'user_id' => $user,
                'start_date' => $r['start']->format(self::FMT),
                'end_date' => $r['end']->format(self::FMT),
                'days' => $r['days'],
                'daily_rate' => $rate,
                'discount' => $discount,
                'late_fee' => $lateFee,
                'total' => $total,
                'deposit' => $deposit,
                'status' => $status,
                'picked_up_at' => $pickedUp?->format(self::FMT),
                'returned_at' => $returned?->format(self::FMT),
                'pickup_mileage' => null,
                'return_mileage' => null,
                'notes' => null,
                'created_at' => $created->format(self::FMT),
                'updated_at' => ($returned ?? $created)->format(self::FMT),
            ]);

            if ($deposit > 0) {
                $this->pay($id, null, $deposit, $created, $user, 'Deposit');
            }

            // Returned rentals are settled at return; a few are left owing.
            if ($status === 'returned' && mt_rand(1, 100) > 4) {
                $this->pay($id, null, round($total - $deposit, 2), $returned, $user);
            }
        }

        // Vehicle status follows the live bookings.
        DB::table('vehicles')->whereIn('id', DB::table('bookings')->where('status', 'reserved')->pluck('vehicle_id'))->update(['status' => 'reserved']);
        DB::table('vehicles')->whereIn('id', DB::table('bookings')->where('status', 'active')->pluck('vehicle_id'))->update(['status' => 'rented']);
        // One vehicle is in the workshop.
        $idle = $this->workshopId;
        DB::table('vehicles')->where('id', $idle)->update(['status' => 'maintenance', 'notes' => 'Brake service at the workshop']);
    }

    private function hasLaterStart(array $rows, int $vehicleId, Carbon $after, Carbon $today): bool
    {
        foreach ($rows as $other) {
            if ($other['vehicle']['id'] === $vehicleId && $other['start']->gt($after) && $other['start']->lte($today->copy()->addDays(7))) {
                return true;
            }
        }

        return false;
    }

    private function seedSales(Carbon $start, Carbon $today): void
    {
        // Showroom stock: [brand, model, type, seats, cost, price, how many]
        $stock = [
            ['Toyota', 'Prius', 'car', 5, 16500, 19200, 3],
            ['Lexus', 'NX 300', 'suv', 5, 38000, 43500, 3],
            ['Toyota', 'Highlander', 'suv', 7, 33000, 37800, 3],
            ['Ford', 'Ranger Wildtrak', 'pickup', 5, 31000, 34900, 2],
            ['Hyundai', 'Starex', 'van', 11, 22000, 25500, 1],
            ['Honda', 'Dream 125', 'motorbike', 2, 1950, 2350, 6],
            ['Honda', 'PCX 160', 'motorbike', 2, 3100, 3650, 4],
        ];
        $colors = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue'];
        $methods = ['cash', 'cash', 'bank', 'bank', 'installment'];
        $seq = 0;
        $plate = 5000;

        foreach ($stock as [$brand, $model, $type, $seats, $cost, $price, $count]) {
            for ($n = 0; $n < $count; $n++) {
                $purchased = $start->copy()->addDays(mt_rand(0, 300));
                $plate += mt_rand(5, 60);

                $id = DB::table('vehicles')->insertGetId([
                    'plate_no' => 'NEW-'.$plate,
                    'brand' => $brand,
                    'model' => $model,
                    'year' => $purchased->year - mt_rand(0, 3),
                    'type' => $type,
                    'color' => $colors[mt_rand(0, count($colors) - 1)],
                    'seats' => $seats,
                    'purpose' => 'sale',
                    'status' => 'available',
                    'daily_rate' => 0,
                    'sale_price' => $price,
                    'purchase_cost' => $cost,
                    'purchased_on' => $purchased->format(self::FMT),
                    'mileage' => $type === 'motorbike' ? mt_rand(0, 3000) : mt_rand(15000, 60000),
                    'notes' => null,
                    'created_at' => $purchased->format(self::FMT),
                    'updated_at' => $purchased->format(self::FMT),
                ]);

                // About two thirds of the stock has sold.
                $soldOn = $purchased->copy()->addDays(mt_rand(10, 120));
                if ($soldOn->gt($today) || mt_rand(1, 100) > 70) {
                    continue;
                }

                $seq++;
                $discount = mt_rand(0, 1) ? round($price * mt_rand(1, 4) / 100, -1) : 0;
                $total = $price - $discount;
                $method = $type === 'motorbike' ? 'cash' : $methods[mt_rand(0, count($methods) - 1)];
                $user = $this->staff[mt_rand(0, count($this->staff) - 1)];
                $customer = $this->customers[mt_rand(0, count($this->customers) - 1)];

                $saleId = DB::table('sales')->insertGetId([
                    'sale_no' => 'SL'.str_pad((string) $seq, 6, '0', STR_PAD_LEFT),
                    'customer_id' => $customer,
                    'vehicle_id' => $id,
                    'user_id' => $user,
                    'sale_date' => $soldOn->format(self::FMT),
                    'price' => $price,
                    'discount' => $discount,
                    'total' => $total,
                    'cost' => $cost,
                    'payment_method' => $method,
                    'notes' => null,
                    'created_at' => $soldOn->copy()->setTime(14, 0)->format(self::FMT),
                    'updated_at' => $soldOn->copy()->setTime(14, 0)->format(self::FMT),
                ]);

                DB::table('vehicles')->where('id', $id)->update(['status' => 'sold']);

                if ($method === 'installment') {
                    // 30% down, then monthly instalments of 10% up to today.
                    $this->pay(null, $saleId, round($total * 0.3, 2), $soldOn, $user, 'Down payment');
                    for ($m = 1, $due = $soldOn->copy()->addMonth(); $m <= 7 && $due->lte($today); $m++, $due->addMonth()) {
                        $this->pay(null, $saleId, round($total * 0.1, 2), $due, $user, 'Instalment '.$m);
                    }
                } else {
                    $this->pay(null, $saleId, $total, $soldOn, $user, null, $method);
                }
            }
        }
    }

    private function seedExpenses(array $fleet, Carbon $start, Carbon $today): void
    {
        $rows = [];
        $user = $this->staff[0];

        foreach ($fleet as $v) {
            $cost = (float) DB::table('vehicles')->where('id', $v['id'])->value('purchase_cost');
            $bike = $v['type'] === 'motorbike';
            $from = $v['purchased']->greaterThan($start) ? $v['purchased']->copy() : $start->copy();

            // Insurance once a year, ~3% of the vehicle's value.
            $rows[] = [$v['id'], $from->copy()->addDays(mt_rand(0, 25)), 'insurance', round($cost * 0.03, 2), 'Annual insurance premium'];

            for ($d = $from->copy()->addDays(mt_rand(20, 80)); $d->lte($today); $d->addDays(mt_rand(75, 110))) {
                $rows[] = [$v['id'], $d->copy(), 'maintenance', $bike ? mt_rand(12, 35) : mt_rand(90, 260) + ($v['type'] === 'suv' ? 60 : 0), $bike ? 'Oil change & check-up' : 'Scheduled service'];
            }

            for ($d = $from->copy()->addDays(mt_rand(0, 30)); $d->lte($today); $d->addMonth()) {
                $rows[] = [$v['id'], $d->copy(), 'cleaning', $bike ? 2 : mt_rand(8, 15), 'Monthly wash & detailing'];
            }

            // The occasional repair.
            if (mt_rand(0, 2) === 0) {
                $rows[] = [$v['id'], $from->copy()->addDays(mt_rand(30, 300))->min($today), 'maintenance', $bike ? mt_rand(30, 90) : mt_rand(250, 900), $bike ? 'Tyre & brake replacement' : 'Repair: tyres / battery / bodywork'];
            }
        }

        // Company overheads with no vehicle attached.
        for ($d = $start->copy(); $d->lte($today); $d->addMonth()) {
            $rows[] = [null, $d->copy()->day(5), 'other', 1200, 'Office & yard rent'];
            $rows[] = [null, $d->copy()->day(10), 'other', mt_rand(150, 230), 'Electricity, water & internet'];
            $rows[] = [null, $d->copy()->day(20), 'fuel', mt_rand(80, 160), 'Fuel for vehicle delivery & pickup'];
        }

        $insert = [];
        foreach ($rows as [$vehicle, $date, $category, $amount, $description]) {
            if ($date->gt($today)) {
                continue;
            }
            $insert[] = [
                'vehicle_id' => $vehicle,
                'user_id' => $user,
                'spent_on' => $date->format(self::FMT),
                'category' => $category,
                'amount' => $amount,
                'description' => $description,
                'created_at' => $date->format(self::FMT),
                'updated_at' => $date->format(self::FMT),
            ];
        }

        foreach (array_chunk($insert, 200) as $chunk) {
            DB::table('expenses')->insert($chunk);
        }
    }

    private function pay(?int $booking, ?int $sale, float $amount, Carbon $at, int $user, ?string $reference = null, ?string $method = null): void
    {
        if ($amount <= 0) {
            return;
        }

        $at = $at->copy();
        if ($at->hour === 0) {
            $at->setTime(mt_rand(9, 17), mt_rand(0, 59));
        }

        DB::table('payments')->insert([
            'booking_id' => $booking,
            'sale_id' => $sale,
            'user_id' => $user,
            'amount' => $amount,
            'method' => $method ?? (['cash', 'cash', 'bank', 'card'][mt_rand(0, 3)]),
            'paid_at' => $at->format(self::FMT),
            'reference' => $reference,
            'created_at' => $at->format(self::FMT),
            'updated_at' => $at->format(self::FMT),
        ]);
    }
}
