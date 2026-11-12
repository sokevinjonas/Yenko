<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $card = $this->cardVerifications()->latest('id')->first();

        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'name' => $this->name,
            'email' => $this->email,
            'hall' => $this->hall ? ['id' => $this->hall->id, 'name' => $this->hall->name] : null,
            'whatsapp' => $this->whatsapp,
            'gender' => $this->gender?->value,
            'bio' => $this->bio,
            'avatar_url' => $this->avatarUrl(),
            'is_verified' => (bool) $this->is_verified,
            'verification_method' => $this->verification_method?->value,
            'email_verified' => $this->email_verified_at !== null,
            'card_verification' => $card ? new CardVerificationResource($card) : null,
            'is_suspended' => (bool) $this->is_suspended,
            'suspension_reason' => $this->suspension_reason,
            'profile_complete' => $this->isProfileComplete(),
            'can_participate' => $this->canParticipate(),
            'participation_blocker' => $this->participationBlocker(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
