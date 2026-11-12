<?php

namespace App\Models;

use App\Enums\ActivityCategory;
use App\Enums\PlanStatus;
use App\Enums\PlanType;
use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'type', 'title', 'description', 'destination_id', 'course', 'category',
        'meeting_point', 'starts_at', 'seats_total', 'price_per_person', 'women_only',
        'auto_accept', 'whatsapp_group_link', 'status',
    ];

    protected function casts(): array
    {
        return [
            'type' => PlanType::class,
            'status' => PlanStatus::class,
            'category' => ActivityCategory::class,
            'starts_at' => 'datetime',
            'reminder_sent_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'price_per_person' => 'decimal:2',
            'women_only' => 'boolean',
            'auto_accept' => 'boolean',
            'is_boosted' => 'boolean',
            'seats_total' => 'integer',
        ];
    }

    // ---- Relations -------------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(PlanRequest::class);
    }

    public function acceptedRequests(): HasMany
    {
        return $this->requests()->where('status', RequestStatus::Accepted);
    }

    // ---- Scopes ----------------------------------------------------------

    /** Plans shown in the public Explore feed. */
    public function scopeDiscoverable(Builder $query): Builder
    {
        return $query->where('status', PlanStatus::Open)
            ->where('starts_at', '>', now())
            ->whereHas('user', fn (Builder $q) => $q->where('is_suspended', false)->whereNull('deleted_at'));
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', [PlanStatus::Open, PlanStatus::Full]);
    }

    // ---- Helpers ---------------------------------------------------------

    public function isActive(): bool
    {
        return in_array($this->status, [PlanStatus::Open, PlanStatus::Full], true);
    }

    public function hasStarted(): bool
    {
        return $this->starts_at->isPast();
    }

    public function acceptedCount(): int
    {
        return $this->accepted_requests_count ?? $this->acceptedRequests()->count();
    }

    public function seatsLeft(): int
    {
        return max(0, $this->seats_total - $this->acceptedCount());
    }

    public function isCreator(?User $user): bool
    {
        return $user !== null && $this->user_id === $user->id;
    }

    public function requestFor(?User $user): ?PlanRequest
    {
        if ($user === null) {
            return null;
        }

        return $this->relationLoaded('requests')
            ? $this->requests->firstWhere('user_id', $user->id)
            : $this->requests()->where('user_id', $user->id)->first();
    }

    public function isMember(?User $user): bool
    {
        return $this->requestFor($user)?->status === RequestStatus::Accepted;
    }

    /** Recompute open/full after a seat change. */
    public function refreshSeatStatus(): void
    {
        if (! $this->isActive()) {
            return;
        }
        unset($this->accepted_requests_count);
        $status = $this->acceptedRequests()->count() >= $this->seats_total ? PlanStatus::Full : PlanStatus::Open;
        if ($this->status !== $status) {
            $this->forceFill(['status' => $status])->save();
        }
    }
}
