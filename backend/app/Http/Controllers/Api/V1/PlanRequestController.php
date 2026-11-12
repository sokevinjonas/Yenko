<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlanRequestResource;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PlanRequestController extends Controller
{
    public function __construct(private PlanService $service) {}

    public function join(Request $request, Plan $plan): PlanResource
    {
        $data = $request->validate(['message' => ['nullable', 'string', 'max:200']]);
        $this->service->join($plan, $request->user(), $data['message'] ?? null);

        return $this->planDetail($request, $plan);
    }

    public function leave(Request $request, Plan $plan): PlanResource
    {
        $this->service->leave($plan, $request->user());

        return $this->planDetail($request, $plan);
    }

    /** Requests of a plan, for its organiser: pending first, then members. */
    public function index(Request $request, Plan $plan): AnonymousResourceCollection
    {
        abort_unless($plan->isCreator($request->user()), 403, 'Only the organiser can see the requests.');

        $requests = $plan->requests()
            ->whereIn('status', [RequestStatus::Pending, RequestStatus::Accepted])
            ->with('user.hall')
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->oldest()
            ->get();

        return PlanRequestResource::collection($requests);
    }

    public function accept(Request $request, PlanRequest $planRequest): PlanRequestResource
    {
        $this->authorizeOrganiser($request, $planRequest);

        return new PlanRequestResource($this->service->accept($planRequest)->load('user.hall'));
    }

    public function reject(Request $request, PlanRequest $planRequest): PlanRequestResource
    {
        $this->authorizeOrganiser($request, $planRequest);

        return new PlanRequestResource($this->service->reject($planRequest)->load('user.hall'));
    }

    public function remove(Request $request, PlanRequest $planRequest): PlanRequestResource
    {
        $this->authorizeOrganiser($request, $planRequest);

        return new PlanRequestResource($this->service->remove($planRequest)->load('user.hall'));
    }

    private function authorizeOrganiser(Request $request, PlanRequest $planRequest): void
    {
        abort_unless($planRequest->plan->isCreator($request->user()), 403, 'Only the organiser can manage requests.');
    }

    private function planDetail(Request $request, Plan $plan): PlanResource
    {
        $plan = $plan->fresh(['user.hall', 'destination']);
        $plan->load(['requests' => fn ($q) => $q->where('user_id', $request->user()->id)]);

        return (new PlanResource($plan))->detailed();
    }
}
