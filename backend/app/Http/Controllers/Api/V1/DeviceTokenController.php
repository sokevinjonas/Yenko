<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['required', Rule::in(['android', 'ios', 'web'])],
        ]);

        DeviceToken::updateOrCreate(['token' => $data['token']], [
            'user_id' => $request->user()->id,
            'platform' => $data['platform'],
            'last_used_at' => now(),
        ]);

        return response()->json(['message' => 'Device registered.'], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string']]);
        $request->user()->deviceTokens()->where('token', $data['token'])->delete();

        return response()->json(['message' => 'Device removed.']);
    }
}
