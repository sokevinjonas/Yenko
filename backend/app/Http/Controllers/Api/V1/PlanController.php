<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityCategory;
use App\Enums\PlanStatus;
use App\Enums\PlanType;
use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Services\PlanService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PlanController extends Controller
{
    public function __construct(private PlanService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::enum(PlanType::class)],
            'destination_id' => ['nullable', 'integer'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'women_only' => ['nullable', 'boolean'],
            'category' => ['nullable', Rule::enum(ActivityCategory::class)],
            'q' => ['nullable', 'string', 'max:80'],
        ]);

        $plans = $this->baseQuery($request)
            ->discoverable()
            ->when($filters['type'] ?? null, fn (Builder $q, $v) => $q->where('type', $v))
            ->when($filters['destination_id'] ?? null, fn (Builder $q, $v) => $q->where('destination_id', $v))
            ->when($filters['date'] ?? null, fn (Builder $q, $v) => $q->whereDate('starts_at', $v))
            ->when($request->boolean('women_only'), fn (Builder $q) => $q->where('women_only', true))
            ->when($filters['category'] ?? null, fn (Builder $q, $v) => $q->where('category', $v))
            ->when($filters['q'] ?? null, function (Builder $q, $term) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
                $q->where(fn (Builder $w) => $w->where('title', 'like', $like)
                    ->orWhere('meeting_point', 'like', $like)
                    ->orWhere('course', 'like', $like)
                    ->orWhereHas('destination', fn (Builder $d) => $d->where('name', 'like', $like)));
            })
            ->orderByDesc('is_boosted')
            ->orderBy('starts_at')
            ->paginate(20);

        return PlanResource::collection($plans);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $scope = $request->validate(['scope' => ['nullable', Rule::in(['created', 'joined', 'past'])]])['scope'] ?? 'created';
        $user = $request->user();
        $memberOf = fn (Builder $q, array $statuses) => $q->whereHas('requests', fn (Builder $r) => $r
            ->where('user_id', $user->id)->whereIn('status', $statuses));

        $query = $this->baseQuery($request);
        match ($scope) {
            'created' => $query->where('user_id', $user->id)->active()->orderBy('starts_at'),
            'joined' => $memberOf($query, [RequestStatus::Pending, RequestStatus::Accepted])->active()->orderBy('starts_at'),
            'past' => $query->whereIn('status', [PlanStatus::Done, PlanStatus::Cancelled])
                ->where(fn (Builder $q) => $q->where('user_id', $user->id)
                    ->orWhereHas('requests', fn (Builder $r) => $r->where('user_id', $user->id)->where('status', RequestStatus::Accepted)))
                ->orderByDesc('starts_at'),
        };

        return PlanResource::collection($query->paginate(20));
    }

    public function show(Request $request, Plan $plan): PlanResource
    {
        $plan->load(['user.hall', 'destination', 'requests' => fn ($q) => $q->where('user_id', $request->user()->id)]);

        return (new PlanResource($plan))->detailed();
    }

    public function store(Request $request): PlanResource
    {
        $user = $request->user();
        $type = PlanType::tryFrom((string) $request->input('type'));
        $data = $request->validate($this->rules($type));

        if ($data['women_only'] ?? false) {
            $this->ensureCanUseWomenOnly($request);
        }
        $max = config('yenko.plans.max_active_per_user');
        abort_if($user->plans()->active()->count() >= $max, 422, "You can have at most {$max} active plans.");

        $plan = $user->plans()->create($this->clean($data, $type) + ['status' => PlanStatus::Open]);

        return $this->show($request, $plan);
    }

    public function update(Request $request, Plan $plan): PlanResource
    {
        abort_unless($plan->isCreator($request->user()), 403, 'Only the organiser can edit this plan.');
        abort_unless($plan->isActive(), 422, 'This plan can no longer be edited.');

        $rules = collect($this->rules($plan->type))
            ->except('type')
            ->map(fn ($r) => ['sometimes', ...$r])
            ->all();
        $data = $request->validate($rules);

        if (isset($data['seats_total']) && $data['seats_total'] < $plan->acceptedCount()) {
            throw ValidationException::withMessages(['seats_total' => 'You already accepted '.$plan->acceptedCount().' people.']);
        }
        if (($data['women_only'] ?? false) && ! $plan->women_only) {
            $this->ensureCanUseWomenOnly($request);
            $hasMen = $plan->acceptedRequests()->whereHas('user', fn ($q) => $q->where('gender', '!=', 'female'))->exists();
            if ($hasMen) {
                throw ValidationException::withMessages(['women_only' => 'Some accepted members are not women.']);
            }
        }

        $plan->update($this->clean($data, $plan->type, partial: true));
        $plan->refreshSeatStatus();

        return $this->show($request, $plan->fresh());
    }

    public function cancel(Request $request, Plan $plan): PlanResource
    {
        abort_unless($plan->isCreator($request->user()), 403, 'Only the organiser can cancel this plan.');
        $this->service->cancel($plan);

        return $this->show($request, $plan->fresh());
    }

    private function baseQuery(Request $request): Builder
    {
        return Plan::query()
            ->with(['user.hall', 'destination', 'requests' => fn ($q) => $q->where('user_id', $request->user()->id)])
            ->withCount('acceptedRequests');
    }

    private function rules(?PlanType $type): array
    {
        $maxSeats = config('yenko.plans.seats.'.($type?->value ?? 'ride'));

        return [
            'type' => ['required', Rule::enum(PlanType::class)],
            'title' => ['required', 'string', 'min:3', 'max:80'],
            'description' => ['nullable', 'string', 'max:500'],
            'meeting_point' => ['required', 'string', 'max:120'],
            'starts_at' => ['required', 'date', 'after:now', 'before_or_equal:'.now()->addDays(config('yenko.plans.max_days_ahead'))->toDateTimeString()],
            'seats_total' => ['required', 'integer', 'min:1', 'max:'.$maxSeats],
            'women_only' => ['boolean'],
            'auto_accept' => ['boolean'],
            'whatsapp_group_link' => ['nullable', 'url', 'starts_with:https://chat.whatsapp.com/', 'max:255'],
            'destination_id' => $type === PlanType::Ride
                ? ['required', Rule::exists('destinations', 'id')->where('is_active', true)]
                : ['nullable'],
            'price_per_person' => $type === PlanType::Ride ? ['nullable', 'numeric', 'min:0', 'max:10000'] : ['nullable'],
            'course' => ['nullable', 'string', 'max:60'],
            'category' => $type === PlanType::Activity ? ['required', Rule::enum(ActivityCategory::class)] : ['nullable'],
        ];
    }

    /** Drop fields that do not belong to the plan type. */
    private function clean(array $data, PlanType $type, bool $partial = false): array
    {
        $nullify = match ($type) {
            PlanType::Ride => ['course', 'category'],
            PlanType::Study => ['destination_id', 'price_per_person', 'category'],
            PlanType::Activity => ['destination_id', 'price_per_person', 'course'],
        };
        foreach ($nullify as $field) {
            if (! $partial || array_key_exists($field, $data)) {
                $data[$field] = null;
            }
        }
        unset($data['type']);

        return $partial ? $data : ['type' => $type] + $data;
    }

    private function ensureCanUseWomenOnly(Request $request): void
    {
        if (! $request->user()->isFemale()) {
            throw ValidationException::withMessages(['women_only' => 'Only women can create women-only plans.']);
        }
    }
}
