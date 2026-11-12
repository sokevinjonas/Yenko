<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ReportReason;
use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function store(Request $request, ReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'reported_user_id' => ['required', 'integer', 'exists:users,id'],
            'plan_id' => ['nullable', 'integer', 'exists:plans,id'],
            'reason' => ['required', Rule::enum(ReportReason::class)],
            'details' => ['nullable', 'string', 'max:500'],
        ]);

        $reports->create($request->user(), $data);

        return response()->json(['message' => 'Thanks. Our team will look into it.'], 201);
    }
}
