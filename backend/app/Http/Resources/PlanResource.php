<?php

namespace App\Http\Resources;

use App\Enums\RequestStatus;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    private bool $detailed = false;

    /** Include contacts and members (plan detail screen). */
    public function detailed(): static
    {
        $this->detailed = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isCreator = $this->isCreator($viewer);
        $myRequest = $this->requestFor($viewer);
        $isMember = $myRequest?->status === RequestStatus::Accepted;
        $blocker = $viewer ? app(PlanService::class)->joinBlocker($this->resource, $viewer) : null;

        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'title' => $this->title,
            'description' => $this->description,
            'destination' => $this->destination ? [
                'id' => $this->destination->id,
                'name' => $this->destination->name,
                'zone' => $this->destination->zone->value,
            ] : null,
            'course' => $this->course,
            'category' => $this->category?->value,
            'meeting_point' => $this->meeting_point,
            'starts_at' => $this->starts_at->toIso8601String(),
            'seats_total' => $this->seats_total,
            'accepted_count' => $this->acceptedCount(),
            'seats_left' => $this->seatsLeft(),
            'price_per_person' => $this->price_per_person !== null ? (float) $this->price_per_person : null,
            'women_only' => $this->women_only,
            'auto_accept' => $this->auto_accept,
            'status' => $this->status->value,
            'is_boosted' => $this->is_boosted,
            'created_at' => $this->created_at->toIso8601String(),
            'creator' => new UserPublicResource($this->user),
            'viewer' => [
                'is_creator' => $isCreator,
                'request_id' => $myRequest?->id,
                'request_status' => $myRequest?->status->value,
                'can_join' => $blocker === null,
                'join_blocker' => $blocker,
                'join_blocker_message' => $blocker ? PlanService::blockerMessage($blocker) : null,
            ],
            'pending_requests_count' => $this->when($isCreator, fn () => $this->requests()->where('status', RequestStatus::Pending)->count()),
            'contacts' => $this->when($this->detailed && ($isCreator || $isMember), fn () => $this->contacts($isCreator)),
        ];
    }

    /** Only the creator and accepted members ever receive this block. */
    private function contacts(bool $isCreator): array
    {
        $members = $this->acceptedRequests()->with('user.hall')->get()->map(fn ($r) => [
            ...(new UserPublicResource($r->user))->resolve(),
            'whatsapp' => $isCreator ? $r->user->whatsapp : null,
        ]);

        return [
            'creator_whatsapp' => $isCreator ? null : $this->user->whatsapp,
            'whatsapp_group_link' => $this->whatsapp_group_link,
            'members' => $members->values(),
        ];
    }
}
