<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CardStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CardVerificationResource;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardVerificationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $card = $request->user()->cardVerifications()->latest('id')->first();

        return response()->json(['data' => $card ? new CardVerificationResource($card) : null]);
    }

    public function store(Request $request, ImageService $images): JsonResponse
    {
        $user = $request->user();
        abort_if($user->is_verified, 422, 'Your account is already verified.');
        abort_if(
            $user->cardVerifications()->where('status', CardStatus::Pending)->exists(),
            422,
            'Your student card is already being reviewed.'
        );

        $request->validate(['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);

        $card = $user->cardVerifications()->create([
            'photo_path' => $images->storeCardPhoto($request->file('photo')),
            'status' => CardStatus::Pending,
        ]);

        return response()->json(['data' => new CardVerificationResource($card)], 201);
    }
}
