<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    public const METHODS = ['cash', 'bank', 'installment'];

    protected $fillable = [
        'sale_no', 'customer_id', 'vehicle_id', 'user_id', 'sale_date', 'price', 'discount',
        'total', 'cost', 'payment_method', 'notes',
    ];

    protected $appends = ['paid', 'balance'];

    protected function casts(): array
    {
        return [
            'sale_date' => 'date:Y-m-d',
            'price' => 'float',
            'discount' => 'float',
            'total' => 'float',
            'cost' => 'float',
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
        return round($this->total - $this->paid, 2);
    }

    public static function nextNumber(): string
    {
        return 'SL'.str_pad((string) ((int) static::max('id') + 1), 6, '0', STR_PAD_LEFT);
    }
}
