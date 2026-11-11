<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Vehicle extends Model
{
    use Auditable;

    public const TYPES = ['car', 'suv', 'van', 'pickup', 'motorbike'];

    public const PURPOSES = ['rent', 'sale', 'both'];

    public const STATUSES = ['available', 'reserved', 'rented', 'maintenance', 'sold'];

    protected $fillable = [
        'plate_no', 'brand', 'model', 'year', 'type', 'color', 'seats', 'purpose',
        'status', 'daily_rate', 'sale_price', 'purchase_cost', 'purchased_on', 'mileage', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'seats' => 'integer',
            'mileage' => 'integer',
            'daily_rate' => 'float',
            'sale_price' => 'float',
            'purchase_cost' => 'float',
            'purchased_on' => 'date:Y-m-d',
        ];
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function sale(): HasOne
    {
        return $this->hasOne(Sale::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function canBeRented(): bool
    {
        return in_array($this->purpose, ['rent', 'both'], true)
            && ! in_array($this->status, ['sold', 'maintenance'], true);
    }

    public function canBeSold(): bool
    {
        return in_array($this->purpose, ['sale', 'both'], true) && $this->status === 'available';
    }

    /**
     * Whether another live booking already holds this vehicle on any day
     * between $start and $end (inclusive) -- the double-booking check the
     * paper diary could never do.
     */
    public function isBookedBetween(string $start, string $end, ?int $ignoreBookingId = null): bool
    {
        return $this->bookings()
            ->overlapping($start, $end)
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            ->exists();
    }

    /** Set the status from what its live bookings say it should be. */
    public function refreshStatus(): void
    {
        if (in_array($this->status, ['sold', 'maintenance'], true)) {
            return;
        }

        $live = $this->bookings()->whereIn('status', [Booking::STATUS_RESERVED, Booking::STATUS_ACTIVE]);

        $status = (clone $live)->where('status', Booking::STATUS_ACTIVE)->exists()
            ? 'rented'
            : ($live->exists() ? 'reserved' : 'available');

        $this->forceFill(['status' => $status])->save();
    }

    public function auditLabel(): string
    {
        return trim("{$this->brand} {$this->model} · {$this->plate_no}");
    }
}
