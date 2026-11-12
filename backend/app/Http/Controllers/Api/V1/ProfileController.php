<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Gender;
use App\Http\Controllers\Controller;
use App\Http\Resources\MeResource;
use App\Services\ImageService;
use App\Services\PlanService;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): MeResource
    {
        return new MeResource($request->user());
    }

    public function update(Request $request): MeResource
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:60'],
            'hall_id' => ['sometimes', 'nullable', Rule::exists('halls', 'id')->where('is_active', true)],
            'whatsapp' => ['sometimes', 'nullable', 'string', 'max:20'],
            'gender' => ['sometimes', 'nullable', Rule::enum(Gender::class)],
            'bio' => ['sometimes', 'nullable', 'string', 'max:160'],
        ]);

        if (array_key_exists('whatsapp', $data) && $data['whatsapp'] !== null) {
            $data['whatsapp'] = Phone::normalize($data['whatsapp'])
                ?? throw ValidationException::withMessages(['whatsapp' => 'Enter a valid Ghana number, e.g. 024 123 4567.']);
        }

        // Gender protects women-only plans: it can be set once, then only an admin can change it.
        if (array_key_exists('gender', $data) && $user->gender !== null && $data['gender'] !== $user->gender->value) {
            throw ValidationException::withMessages(['gender' => 'Gender can only be set once. Contact support to change it.']);
        }

        $user->fill($data)->save();

        return new MeResource($user->fresh());
    }

    public function avatar(Request $request, ImageService $images): MeResource
    {
        $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072']]);
        $user = $request->user();

        $old = $user->avatar_path;
        $user->forceFill(['avatar_path' => $images->storeAvatar($request->file('avatar'))])->save();
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return new MeResource($user);
    }

    public function password(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], ['current_password.current_password' => 'Your current password is wrong.']);

        $user = $request->user();
        $user->forceFill(['password' => $data['password']])->save();
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Password updated.']);
    }

    public function destroy(Request $request, PlanService $plans): JsonResponse
    {
        $request->validate(['password' => ['required', 'current_password:sanctum']], [
            'password.current_password' => 'Wrong password.',
        ]);
        $user = $request->user();

        $plans->detachUser($user);
        $user->anonymiseAndDelete();

        return response()->json(['message' => 'Your account was deleted.']);
    }
}
