<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an ActivityLog row whenever the model is created, updated or deleted
 * by a signed-in user. Secrets (password, tokens) are never stored.
 */
trait Auditable
{
    /** Attributes never written to the audit log. */
    protected static array $auditHidden = ['password', 'remember_token', 'created_at', 'updated_at'];

    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            ActivityLog::record('created', $model, static::auditValues($model->getAttributes()));
        });

        static::updated(function (Model $model) {
            $changes = [];
            foreach (static::auditValues($model->getChanges()) as $field => $new) {
                $changes[$field] = [$model->getOriginal($field), $new];
            }
            if (array_key_exists('password', $model->getChanges())) {
                $changes['password'] = ['•••', '•••'];
            }
            if ($changes) {
                ActivityLog::record('updated', $model, $changes);
            }
        });

        static::deleted(function (Model $model) {
            ActivityLog::record('deleted', $model, static::auditValues($model->getAttributes()));
        });
    }

    private static function auditValues(array $values): array
    {
        return array_diff_key($values, array_flip(static::$auditHidden));
    }

    /** Short human label of the record, shown in the audit log. Models override this. */
    public function auditLabel(): string
    {
        return '#'.$this->getKey();
    }
}
