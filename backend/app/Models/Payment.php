<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use Auditable;

    public const METHODS = ['cash', 'bank', 'card'];

    protected $fillable = ['booking_id', 'sale_id', 'user_id', 'amount', 'method', 'paid_at', 'reference'];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditLabel(): string
    {
        return number_format((float) $this->amount, 2)." {$this->method}".($this->booking_id ? " · booking #{$this->booking_id}" : '').($this->sale_id ? " · sale #{$this->sale_id}" : '');
    }
}
