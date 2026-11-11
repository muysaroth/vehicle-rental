<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Booking extends Model
{
    use Auditable;

    public const STATUS_RESERVED = 'reserved';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_RETURNED = 'returned';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'booking_no', 'customer_id', 'vehicle_id', 'user_id', 'start_date', 'end_date', 'days',
        'daily_rate', 'discount', 'late_fee', 'total', 'deposit', 'status', 'picked_up_at',
        'returned_at', 'pickup_mileage', 'return_mileage', 'notes',
    ];

    protected $appends = ['paid', 'balance'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'days' => 'integer',
            'daily_rate' => 'float',
            'discount' => 'float',
            'late_fee' => 'float',
            'total' => 'float',
            'deposit' => 'float',
            'picked_up_at' => 'datetime',
            'returned_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getPaidAttribute(): float
    {
        $sum = $this->relationLoaded('payments') ? $this->payments->sum('amount') : $this->payments()->sum('amount');

        return round((float) $sum, 2);
    }

    public function getBalanceAttribute(): float
    {
        return $this->status === self::STATUS_CANCELLED ? 0.0 : round($this->total - $this->paid, 2);
    }

    /**
     * Live bookings that hold the vehicle on any day of $start..$end.
     *
     * A rental that is out (active) holds the car until it actually comes
     * back, not until its end date -- so an overdue rental still blocks any
     * request starting today or earlier.
     */
    public function scopeOverlapping(Builder $query, string $start, string $end): Builder
    {
        $startsByToday = Carbon::parse($start)->lte(Carbon::today());

        return $query
            ->whereIn('status', [self::STATUS_RESERVED, self::STATUS_ACTIVE])
            ->whereDate('start_date', '<=', $end)
            ->where(fn (Builder $q) => $q
                ->whereDate('end_date', '>=', $start)
                ->when($startsByToday, fn (Builder $q) => $q->orWhere('status', self::STATUS_ACTIVE)));
    }

    /** Whole days, counting both the first and the last (a same-day hire is 1). */
    public static function daysBetween(string $start, string $end): int
    {
        return (int) (new \DateTimeImmutable($start))->diff(new \DateTimeImmutable($end))->days + 1;
    }

    public static function nextNumber(): string
    {
        return 'BK'.str_pad((string) ((int) static::max('id') + 1), 6, '0', STR_PAD_LEFT);
    }

    public function auditLabel(): string
    {
        return (string) $this->booking_no;
    }
}
