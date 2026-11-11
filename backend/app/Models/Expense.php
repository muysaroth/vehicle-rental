<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use Auditable;

    public const CATEGORIES = ['maintenance', 'insurance', 'fuel', 'cleaning', 'other'];

    protected $fillable = ['vehicle_id', 'user_id', 'spent_on', 'category', 'amount', 'description'];

    protected function casts(): array
    {
        return [
            'spent_on' => 'date:Y-m-d',
            'amount' => 'float',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditLabel(): string
    {
        return "{$this->category} ".number_format((float) $this->amount, 2).' · '.$this->spent_on?->format('Y-m-d');
    }
}
