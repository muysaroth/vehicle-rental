<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Gate for manager work: the fleet, costs, decision-support reports. */
class EnsureUserManages
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->canManage(), 403, 'This action is restricted to managers.');

        return $next($request);
    }
}
