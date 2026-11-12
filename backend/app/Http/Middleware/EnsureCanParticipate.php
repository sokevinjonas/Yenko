<?php

namespace App\Http\Middleware;

use App\Services\PlanService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only verified, non-suspended students with a complete profile can create or join plans. */
class EnsureCanParticipate
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($code = $request->user()?->participationBlocker()) {
            return response()->json(['message' => PlanService::blockerMessage($code), 'code' => $code], 403);
        }

        return $next($request);
    }
}
