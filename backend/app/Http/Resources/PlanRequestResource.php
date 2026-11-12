<?php

namespace App\Http\Resources;

use App\Enums\RequestStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Seen by the plan creator on the "Manage requests" screen. */
class PlanRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'message' => $this->message,
            'created_at' => $this->created_at->toIso8601String(),
            'responded_at' => $this->responded_at?->toIso8601String(),
            'user' => [
                ...(new UserPublicResource($this->user))->resolve(),
                'gender' => $this->user->gender?->value,
                'whatsapp' => $this->status === RequestStatus::Accepted ? $this->user->whatsapp : null,
            ],
        ];
    }
}
