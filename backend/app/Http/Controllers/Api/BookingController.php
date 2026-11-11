<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The rental transaction processing system.
 *
 *   reserved ──pickup──▶ active ──return──▶ returned
 *       └──cancel──▶ cancelled
 */
class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $today = Carbon::today()->toDateString();

        $bookings = Booking::query()
            ->with(['customer:id,name,phone', 'vehicle:id,plate_no,brand,model,type', 'user:id,name', 'payments'])
            ->when($request->query('status'), function ($q, $status) use ($today) {
                // "overdue" is a view, not a stored status: out on rent past its end date.
                if ($status === 'overdue') {
                    return $q->where('status', Booking::STATUS_ACTIVE)->whereDate('end_date', '<', $today);
                }

                return $q->where('status', $status);
            })
            ->when($request->query('from'), fn ($q, $from) => $q->whereDate('end_date', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->whereDate('start_date', '<=', $to))
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('booking_no', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                ->orWhereHas('vehicle', fn ($v) => $v->where('plate_no', 'like', "%{$search}%"))))
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->limit((int) $request->query('limit', 300))
            ->get();

        return response()->json($bookings);
    }

    public function show(Booking $booking): JsonResponse
    {
        return response()->json($booking->load(['customer', 'vehicle', 'user:id,name', 'payments.user:id,name']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'daily_rate' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'deposit' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', Rule::in(Payment::METHODS)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking = DB::transaction(function () use ($data, $request) {
            $vehicle = Vehicle::lockForUpdate()->findOrFail($data['vehicle_id']);

            $this->ensureBookable($vehicle, $data['start_date'], $data['end_date']);

            $days = Booking::daysBetween($data['start_date'], $data['end_date']);
            $rate = (float) ($data['daily_rate'] ?? $vehicle->daily_rate);
            $discount = (float) ($data['discount'] ?? 0);
            $gross = round($days * $rate, 2);

            if ($discount > $gross) {
                throw ValidationException::withMessages(['discount' => 'The discount cannot be more than the rental amount.']);
            }

            $booking = Booking::create([
                'booking_no' => Booking::nextNumber(),
                'customer_id' => $data['customer_id'],
                'vehicle_id' => $vehicle->id,
                'user_id' => $request->user()->id,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'days' => $days,
                'daily_rate' => $rate,
                'discount' => $discount,
                'total' => round($gross - $discount, 2),
                'deposit' => (float) ($data['deposit'] ?? 0),
                'status' => Booking::STATUS_RESERVED,
                'notes' => $data['notes'] ?? null,
            ]);

            if ($booking->deposit > 0) {
                $booking->payments()->create([
                    'user_id' => $request->user()->id,
                    'amount' => min($booking->deposit, $booking->total),
                    'method' => $data['payment_method'] ?? 'cash',
                    'paid_at' => now(),
                    'reference' => 'Deposit',
                ]);
            }

            $vehicle->refreshStatus();

            return $booking;
        });

        return response()->json($booking->load(['customer', 'vehicle', 'payments']), 201);
    }

    /** Change dates, rate or discount while the booking is still a reservation. */
    public function update(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->status === Booking::STATUS_RESERVED, 422, 'Only a reservation can be changed.');

        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'daily_rate' => ['required', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($booking, $data) {
            $vehicle = Vehicle::lockForUpdate()->findOrFail($booking->vehicle_id);

            if ($vehicle->isBookedBetween($data['start_date'], $data['end_date'], $booking->id)) {
                throw ValidationException::withMessages(['start_date' => 'The vehicle is already booked on some of those days.']);
            }

            $days = Booking::daysBetween($data['start_date'], $data['end_date']);
            $gross = round($days * (float) $data['daily_rate'], 2);
            $discount = min((float) ($data['discount'] ?? 0), $gross);

            $booking->update([
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'days' => $days,
                'daily_rate' => $data['daily_rate'],
                'discount' => $discount,
                'total' => round($gross - $discount, 2),
                'notes' => $data['notes'] ?? $booking->notes,
            ]);
        });

        return response()->json($booking->fresh(['customer', 'vehicle', 'payments']));
    }

    /** The customer collects the keys. */
    public function pickup(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->status === Booking::STATUS_RESERVED, 422, 'Only a reservation can be picked up.');

        $data = $request->validate(['mileage' => ['nullable', 'integer', 'min:0']]);

        abort_if(
            Carbon::parse($booking->start_date)->gt(Carbon::today()),
            422,
            'This booking starts on '.Carbon::parse($booking->start_date)->format('d M Y').'. Change the start date to hand the vehicle over early.'
        );

        DB::transaction(function () use ($booking, $data) {
            $vehicle = $booking->vehicle;

            abort_if($vehicle->status === 'rented', 422, 'This vehicle is still out on another rental.');
            abort_if($vehicle->status === 'maintenance', 422, 'This vehicle is in maintenance.');

            $booking->update([
                'status' => Booking::STATUS_ACTIVE,
                'picked_up_at' => now(),
                'pickup_mileage' => $data['mileage'] ?? $vehicle->mileage,
            ]);

            $vehicle->refreshStatus();
        });

        return response()->json($booking->fresh(['customer', 'vehicle', 'payments']));
    }

    /**
     * The vehicle comes back. A late return is charged at the daily rate for
     * every day past the end date unless staff enter a different late fee.
     */
    public function return(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->status === Booking::STATUS_ACTIVE, 422, 'Only an active rental can be returned.');

        $data = $request->validate([
            'mileage' => ['nullable', 'integer', 'min:0'],
            'late_fee' => ['nullable', 'numeric', 'min:0'],
            'payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', Rule::in(Payment::METHODS)],
        ]);

        DB::transaction(function () use ($booking, $data, $request) {
            $lateFee = array_key_exists('late_fee', $data) && $data['late_fee'] !== null
                ? (float) $data['late_fee']
                : self::lateDays($booking) * $booking->daily_rate;

            $total = round($booking->days * $booking->daily_rate - $booking->discount + $lateFee, 2);

            $booking->update([
                'status' => Booking::STATUS_RETURNED,
                'returned_at' => now(),
                'return_mileage' => $data['mileage'] ?? null,
                'late_fee' => round($lateFee, 2),
                'total' => $total,
            ]);

            if (! empty($data['mileage'])) {
                $booking->vehicle->forceFill(['mileage' => max($booking->vehicle->mileage, (int) $data['mileage'])])->save();
            }

            if (! empty($data['payment_amount'])) {
                $this->recordPayment($booking, (float) $data['payment_amount'], $data['payment_method'] ?? 'cash', $request->user()->id);
            }

            $booking->vehicle->refreshStatus();
        });

        return response()->json($booking->fresh(['customer', 'vehicle', 'payments']));
    }

    public function cancel(Booking $booking): JsonResponse
    {
        abort_unless($booking->status === Booking::STATUS_RESERVED, 422, 'Only a reservation can be cancelled.');

        DB::transaction(function () use ($booking) {
            $booking->update(['status' => Booking::STATUS_CANCELLED]);
            $booking->vehicle->refreshStatus();
        });

        return response()->json($booking->fresh(['customer', 'vehicle', 'payments']));
    }

    public function pay(Request $request, Booking $booking): JsonResponse
    {
        abort_if($booking->status === Booking::STATUS_CANCELLED, 422, 'This booking was cancelled.');

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::in(Payment::METHODS)],
            'reference' => ['nullable', 'string', 'max:60'],
        ]);

        $this->recordPayment($booking, (float) $data['amount'], $data['method'], $request->user()->id, $data['reference'] ?? null);

        return response()->json($booking->fresh(['customer', 'vehicle', 'payments']));
    }

    /** How many days past its end date a rental is (0 if on time). */
    public static function lateDays(Booking $booking): int
    {
        $end = Carbon::parse($booking->end_date)->startOfDay();
        $today = Carbon::today();

        return $today->greaterThan($end) ? (int) $end->diffInDays($today) : 0;
    }

    private function ensureBookable(Vehicle $vehicle, string $start, string $end): void
    {
        if (! $vehicle->canBeRented()) {
            throw ValidationException::withMessages(['vehicle_id' => 'This vehicle is not available for rent.']);
        }

        if ($vehicle->isBookedBetween($start, $end)) {
            throw ValidationException::withMessages(['vehicle_id' => 'The vehicle is already booked on some of those days.']);
        }
    }

    private function recordPayment(Booking $booking, float $amount, string $method, int $userId, ?string $reference = null): void
    {
        $balance = $booking->fresh()->balance;

        if ($amount > $balance + 0.001) {
            throw ValidationException::withMessages(['amount' => 'The payment is more than the balance due ($'.number_format($balance, 2).').']);
        }

        $booking->payments()->create([
            'user_id' => $userId,
            'amount' => round($amount, 2),
            'method' => $method,
            'paid_at' => now(),
            'reference' => $reference,
        ]);
    }
}
