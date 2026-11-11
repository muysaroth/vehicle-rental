<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * MIS reports and the decision-support view.
 *
 * Aggregation is done in PHP rather than SQL so the same code runs on SQLite
 * and MySQL; a company of this size has thousands of rows, not millions.
 *
 * Rental revenue is recognised on the booking's start date and counts
 * reservations that went ahead (active or returned), not cancellations or
 * reservations that have not started.
 */
class ReportController extends Controller
{
    private const EARNING = [Booking::STATUS_ACTIVE, Booking::STATUS_RETURNED];

    /** Today's operational picture (MIS for the front desk). */
    public function dashboard(): JsonResponse
    {
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();

        $fleet = Vehicle::where('status', '!=', 'sold')->get(['id', 'type', 'status', 'purpose']);
        $rentable = $fleet->whereIn('purpose', ['rent', 'both']);

        $active = Booking::where('status', Booking::STATUS_ACTIVE)->get(['id', 'end_date']);

        $monthRental = (float) Booking::whereIn('status', self::EARNING)
            ->whereDate('start_date', '>=', $monthStart)->whereDate('start_date', '<=', $today)->sum('total');
        $monthSales = (float) Sale::whereDate('sale_date', '>=', $monthStart)->whereDate('sale_date', '<=', $today)->sum('total');
        $monthExpenses = (float) Expense::whereDate('spent_on', '>=', $monthStart)->whereDate('spent_on', '<=', $today)->sum('amount');
        $monthCollected = (float) Payment::where('paid_at', '>=', $monthStart)->sum('amount');

        $outstanding = Booking::with('payments')->whereIn('status', [Booking::STATUS_ACTIVE, Booking::STATUS_RETURNED, Booking::STATUS_RESERVED])->get()->sum('balance')
            + Sale::with('payments')->get()->sum('balance');

        $with = ['customer:id,name,phone', 'vehicle:id,plate_no,brand,model,type'];

        return response()->json([
            'fleet' => [
                'total' => $fleet->count(),
                'rentable' => $rentable->count(),
                'available' => $fleet->where('status', 'available')->count(),
                'reserved' => $fleet->where('status', 'reserved')->count(),
                'rented' => $fleet->where('status', 'rented')->count(),
                'maintenance' => $fleet->where('status', 'maintenance')->count(),
                'for_sale' => $fleet->whereIn('purpose', ['sale', 'both'])->where('status', 'available')->count(),
                // Share of the rental fleet out on the road right now.
                'utilization' => $rentable->count() ? round($fleet->where('status', 'rented')->count() / $rentable->count(), 4) : 0,
                'by_type' => $fleet->groupBy('type')->map->count(),
            ],
            'month' => [
                'rental_revenue' => round($monthRental, 2),
                'sales_revenue' => round($monthSales, 2),
                'expenses' => round($monthExpenses, 2),
                'collected' => round($monthCollected, 2),
            ],
            'outstanding' => round($outstanding, 2),
            'active_rentals' => $active->count(),
            'overdue' => Booking::with($with)->where('status', Booking::STATUS_ACTIVE)
                ->whereDate('end_date', '<', $today)->orderBy('end_date')->get(),
            'pickups_today' => Booking::with($with)->where('status', Booking::STATUS_RESERVED)
                ->whereDate('start_date', '<=', $today)->orderBy('start_date')->get(),
            'returns_today' => Booking::with($with)->where('status', Booking::STATUS_ACTIVE)
                ->whereDate('end_date', $today)->get(),
            'customers' => Customer::count(),
        ]);
    }

    /**
     * The decision-support report: for a period, how each vehicle type earns,
     * what it costs, how busy it is, and what each dollar invested returned.
     */
    public function performance(Request $request): JsonResponse
    {
        [$from, $to] = $this->period($request);
        $periodDays = (int) $from->diffInDays($to) + 1;

        $vehicles = Vehicle::with('sale:id,vehicle_id,sale_date')->get();

        $bookings = Booking::whereIn('status', self::EARNING)
            ->whereDate('start_date', '>=', $from)->whereDate('start_date', '<=', $to)
            ->get(['id', 'vehicle_id', 'customer_id', 'start_date', 'days', 'total']);

        $sales = Sale::whereDate('sale_date', '>=', $from)->whereDate('sale_date', '<=', $to)
            ->get(['id', 'vehicle_id', 'customer_id', 'sale_date', 'total', 'cost']);

        $expenses = Expense::whereDate('spent_on', '>=', $from)->whereDate('spent_on', '<=', $to)
            ->get(['id', 'vehicle_id', 'spent_on', 'category', 'amount']);

        $typeOf = $vehicles->pluck('type', 'id');

        $types = collect(Vehicle::TYPES)->map(function (string $type) use ($vehicles, $bookings, $sales, $expenses, $typeOf, $from, $to) {
            $rentalFleet = $vehicles->where('type', $type)->whereIn('purpose', ['rent', 'both']);

            // Days each rental vehicle was owned and not yet sold inside the period.
            $availableDays = $rentalFleet->sum(fn (Vehicle $v) => $this->ownedDays($v, $from, $to));

            $typeBookings = $bookings->filter(fn ($b) => $typeOf[$b->vehicle_id] === $type);
            $typeSales = $sales->filter(fn ($s) => $typeOf[$s->vehicle_id] === $type);
            $typeExpenses = $expenses->filter(fn ($e) => $e->vehicle_id && $typeOf[$e->vehicle_id] === $type);

            $rentalRevenue = (float) $typeBookings->sum('total');
            $rentedDays = (int) $typeBookings->sum('days');
            $expenseTotal = (float) $typeExpenses->sum('amount');
            $salesRevenue = (float) $typeSales->sum('total');
            $salesCost = (float) $typeSales->sum('cost');
            $investment = (float) $rentalFleet->where('status', '!=', 'sold')->sum('purchase_cost');
            $fleetCount = $rentalFleet->where('status', '!=', 'sold')->count();
            $rentalProfit = $rentalRevenue - $expenseTotal;

            return [
                'type' => $type,
                'fleet' => $fleetCount,
                'investment' => round($investment, 2),
                'bookings' => $typeBookings->count(),
                'rented_days' => $rentedDays,
                'available_days' => $availableDays,
                'utilization' => $availableDays ? round(min(1, $rentedDays / $availableDays), 4) : 0,
                'rental_revenue' => round($rentalRevenue, 2),
                'avg_daily_rate' => $rentedDays ? round($rentalRevenue / $rentedDays, 2) : 0,
                'expenses' => round($expenseTotal, 2),
                'rental_profit' => round($rentalProfit, 2),
                'profit_per_vehicle' => $fleetCount ? round($rentalProfit / $fleetCount, 2) : 0,
                // Rental profit in the period per dollar tied up in the fleet.
                'roi' => $investment > 0 ? round($rentalProfit / $investment, 4) : 0,
                'units_sold' => $typeSales->count(),
                'sales_revenue' => round($salesRevenue, 2),
                'sales_profit' => round($salesRevenue - $salesCost, 2),
                'sales_margin' => $salesRevenue > 0 ? round(($salesRevenue - $salesCost) / $salesRevenue, 4) : 0,
            ];
        })->values();

        $totals = [
            'rental_revenue' => round($types->sum('rental_revenue'), 2),
            'sales_revenue' => round($types->sum('sales_revenue'), 2),
            'sales_profit' => round($types->sum('sales_profit'), 2),
            'expenses' => round((float) $expenses->sum('amount'), 2),
            'bookings' => $bookings->count(),
            'units_sold' => $sales->count(),
        ];
        $totals['net_profit'] = round($totals['rental_revenue'] + $totals['sales_profit'] - $totals['expenses'], 2);

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'period_days' => $periodDays,
            'totals' => $totals,
            'types' => $types,
            'recommendation' => $this->recommend($types),
            'monthly' => $this->monthly($from, $to, $bookings, $sales, $expenses),
            'top_customers' => $this->topCustomers($bookings, $sales),
            'top_vehicles' => $this->topVehicles($vehicles, $bookings, $expenses),
            'expenses_by_category' => $expenses->groupBy('category')->map(fn ($g) => round((float) $g->sum('amount'), 2)),
        ]);
    }

    /**
     * Score each rental type on three things a manager weighs before buying
     * more of something: return on the money invested, how busy the type is
     * already (high utilisation means demand is being turned away), and
     * profit per vehicle. Each is scaled 0..1 against the best type.
     */
    private function recommend(Collection $types): array
    {
        $candidates = $types->filter(fn ($t) => $t['fleet'] > 0 && $t['bookings'] > 0)->values();

        if ($candidates->isEmpty()) {
            return ['best' => null, 'ranking' => []];
        }

        $max = fn (string $key) => max(0.0001, (float) $candidates->max($key));

        $ranking = $candidates->map(function ($t) use ($max) {
            $score = 0.4 * max(0, $t['roi']) / $max('roi')
                + 0.35 * $t['utilization'] / $max('utilization')
                + 0.25 * max(0, $t['profit_per_vehicle']) / $max('profit_per_vehicle');

            return [
                'type' => $t['type'],
                'score' => round($score * 100, 1),
                'roi' => $t['roi'],
                'utilization' => $t['utilization'],
                'profit_per_vehicle' => $t['profit_per_vehicle'],
            ];
        })->sortByDesc('score')->values();

        return ['best' => $ranking->first()['type'], 'ranking' => $ranking];
    }

    private function monthly(Carbon $from, Carbon $to, Collection $bookings, Collection $sales, Collection $expenses): array
    {
        $months = [];

        for ($m = $from->copy()->startOfMonth(); $m->lte($to); $m->addMonth()) {
            $months[$m->format('Y-m')] = ['month' => $m->format('Y-m'), 'rental_revenue' => 0.0, 'sales_revenue' => 0.0, 'expenses' => 0.0, 'bookings' => 0, 'units_sold' => 0];
        }

        foreach ($bookings as $b) {
            $k = Carbon::parse($b->start_date)->format('Y-m');
            $months[$k]['rental_revenue'] += $b->total;
            $months[$k]['bookings']++;
        }

        foreach ($sales as $s) {
            $k = Carbon::parse($s->sale_date)->format('Y-m');
            $months[$k]['sales_revenue'] += $s->total;
            $months[$k]['units_sold']++;
        }

        foreach ($expenses as $e) {
            $months[Carbon::parse($e->spent_on)->format('Y-m')]['expenses'] += $e->amount;
        }

        return array_values(array_map(fn ($row) => [
            ...$row,
            'rental_revenue' => round($row['rental_revenue'], 2),
            'sales_revenue' => round($row['sales_revenue'], 2),
            'expenses' => round($row['expenses'], 2),
        ], $months));
    }

    private function topCustomers(Collection $bookings, Collection $sales): array
    {
        $spend = [];

        foreach ($bookings as $b) {
            $spend[$b->customer_id]['rentals'] = ($spend[$b->customer_id]['rentals'] ?? 0) + 1;
            $spend[$b->customer_id]['spend'] = ($spend[$b->customer_id]['spend'] ?? 0) + $b->total;
        }

        foreach ($sales as $s) {
            $spend[$s->customer_id]['purchases'] = ($spend[$s->customer_id]['purchases'] ?? 0) + 1;
            $spend[$s->customer_id]['spend'] = ($spend[$s->customer_id]['spend'] ?? 0) + $s->total;
        }

        $names = Customer::whereIn('id', array_keys($spend))->get(['id', 'name', 'phone'])->keyBy('id');

        return collect($spend)
            ->map(fn ($row, $id) => [
                'id' => $id,
                'name' => $names[$id]->name ?? '?',
                'phone' => $names[$id]->phone ?? '',
                'rentals' => $row['rentals'] ?? 0,
                'purchases' => $row['purchases'] ?? 0,
                'spend' => round($row['spend'], 2),
            ])
            ->sortByDesc('spend')->take(10)->values()->all();
    }

    private function topVehicles(Collection $vehicles, Collection $bookings, Collection $expenses): array
    {
        $byVehicle = $bookings->groupBy('vehicle_id');
        $costs = $expenses->groupBy('vehicle_id');

        return $vehicles->filter(fn ($v) => $byVehicle->has($v->id))
            ->map(fn (Vehicle $v) => [
                'id' => $v->id,
                'plate_no' => $v->plate_no,
                'name' => "{$v->brand} {$v->model}",
                'type' => $v->type,
                'bookings' => $byVehicle[$v->id]->count(),
                'rented_days' => (int) $byVehicle[$v->id]->sum('days'),
                'revenue' => round((float) $byVehicle[$v->id]->sum('total'), 2),
                'expenses' => round((float) ($costs[$v->id] ?? collect())->sum('amount'), 2),
            ])
            ->sortByDesc('revenue')->take(10)->values()->all();
    }

    private function ownedDays(Vehicle $v, Carbon $from, Carbon $to): int
    {
        $start = $v->purchased_on ? Carbon::parse($v->purchased_on)->max($from) : $from->copy();
        $end = $v->sale ? Carbon::parse($v->sale->sale_date)->min($to) : $to->copy();

        return $end->lt($start) ? 0 : (int) $start->diffInDays($end) + 1;
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function period(Request $request): array
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $to = isset($data['to']) ? Carbon::parse($data['to'])->startOfDay() : Carbon::today();
        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : $to->copy()->subMonthsNoOverflow(11)->startOfMonth();

        return [$from, $to];
    }
}
