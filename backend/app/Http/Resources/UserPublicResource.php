<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** What any student can see about another student. Never the email, student ID or phone. */
class UserPublicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar_url' => $this->avatarUrl(),
            'hall' => $this->hall?->name,
            'is_verified' => (bool) $this->is_verified,
        ];
    }
}
