<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use Auditable;

    protected $fillable = ['name', 'phone', 'email', 'id_card_no', 'license_no', 'address', 'notes'];

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function auditLabel(): string
    {
        return trim("{$this->name} · {$this->phone}");
    }
}
