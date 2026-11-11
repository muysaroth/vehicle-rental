<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'This account has been disabled.']);
        }

        ActivityLog::record('login', user: $user);

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        ActivityLog::record('logout');
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    /** Change your own password. Every other signed-in session is signed out. */
    public function password(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'confirmed', 'different:current_password', Password::min(8)],
        ]);

        $user = $request->user();

        // Saved quietly: the audit trail gets one clear "password" entry instead of an "updated" one.
        User::withoutEvents(fn () => $user->forceFill(['password' => $data['password']])->save());

        $current = $user->currentAccessToken();
        $user->tokens()->when($current, fn ($q) => $q->whereKeyNot($current->getKey()))->delete();

        ActivityLog::record('password', $user);

        return response()->json(['ok' => true]);
    }

    /** Company details printed on invoices and rental contracts. */
    public function company(): JsonResponse
    {
        return response()->json(config('rental.company'));
    }
}
