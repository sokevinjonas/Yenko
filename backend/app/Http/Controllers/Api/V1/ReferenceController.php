<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Destination;
use App\Models\Hall;
use Illuminate\Http\JsonResponse;

class ReferenceController extends Controller
{
    public function halls(): JsonResponse
    {
        return response()->json(['data' => Hall::active()->get(['id', 'name'])]);
    }

    public function destinations(): JsonResponse
    {
        return response()->json(['data' => Destination::active()->get(['id', 'name', 'zone'])]);
    }
}
