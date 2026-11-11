<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(User::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(User::ROLES)],
            'is_active' => ['boolean'],
        ]);

        return response()->json(User::create($data), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'email' => ['sometimes', 'required', 'string', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['sometimes', Rule::in(User::ROLES)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        // Never lock the last administrator out.
        $demoting = (isset($data['role']) && $data['role'] !== User::ROLE_ADMIN)
            || (isset($data['is_active']) && ! $data['is_active']);

        if ($user->isAdmin() && $demoting && User::where('role', User::ROLE_ADMIN)->where('is_active', true)->count() <= 1) {
            abort(422, 'At least one active administrator is required.');
        }

        $user->update($data);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 422, 'You cannot delete your own account.');

        $used = $user->hasMany(\App\Models\Booking::class)->exists()
            || $user->hasMany(\App\Models\Sale::class)->exists()
            || $user->hasMany(\App\Models\Payment::class)->exists()
            || $user->hasMany(\App\Models\Expense::class)->exists();

        abort_if($used, 422, 'This account has records. Disable it instead of deleting.');

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['ok' => true]);
    }
}
