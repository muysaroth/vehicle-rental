<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'user_name', 'action', 'subject_type', 'subject_id', 'subject_label', 'changes', 'ip'];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record an action by the signed-in user (or by $user, for login).
     * Nothing is written when there is no user, e.g. while seeding demo data.
     */
    public static function record(string $action, ?Model $subject = null, ?array $changes = null, ?User $user = null): ?self
    {
        $user ??= Auth::user();

        if (! $user instanceof User) {
            return null;
        }

        return static::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'subject_label' => $subject && method_exists($subject, 'auditLabel') ? mb_substr($subject->auditLabel(), 0, 150) : null,
            'changes' => $changes ?: null,
            'ip' => Request::ip(),
        ]);
    }
}
