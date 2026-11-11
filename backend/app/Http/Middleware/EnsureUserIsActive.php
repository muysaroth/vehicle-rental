<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A disabled account is signed out on its next request, even if it still holds
 * a valid token from before it was disabled.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            $user->currentAccessToken()?->delete();
            abort(401, 'This account has been disabled.');
        }

        return $next($request);
    }
}
