<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The audit trail, for administrators. */
class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'max:20'],
            'subject_type' => ['nullable', 'string', 'max:40'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $logs = ActivityLog::query()
            ->when($data['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($data['action'] ?? null, fn ($q, $v) => $q->where('action', $v))
            ->when($data['subject_type'] ?? null, fn ($q, $v) => $q->where('subject_type', $v))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $v.' 00:00:00'))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', $v.' 23:59:59'))
            ->when($data['search'] ?? null, fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('subject_label', 'like', "%{$v}%")
                ->orWhere('user_name', 'like', "%{$v}%")))
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json($logs);
    }
}
