<?php

namespace App\Services;

use App\Enums\PlanStatus;
use App\Enums\RequestStatus;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use App\Notifications\YenkoNotification as N;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class PlanService
{
    /** Why $user cannot join $plan right now, or null when allowed. */
    public function joinBlocker(Plan $plan, User $user): ?string
    {
        $existing = $plan->requestFor($user);

        return match (true) {
            $plan->isCreator($user) => 'own_plan',
            in_array($existing?->status, [RequestStatus::Pending, RequestStatus::Accepted], true) => 'already_requested',
            $existing?->status === RequestStatus::Removed => 'removed',
            $user->participationBlocker() !== null => $user->participationBlocker(),
            $plan->hasStarted() => 'started',
            $plan->status === PlanStatus::Full => 'full',
            $plan->status !== PlanStatus::Open => 'not_open',
            $plan->women_only && ! $user->isFemale() => 'women_only',
            default => null,
        };
    }

    public static function blockerMessage(string $code): string
    {
        return match ($code) {
            'own_plan' => "You can't join your own plan.",
            'already_requested' => 'You already asked to join this plan.',
            'started' => 'This plan has already started.',
            'full' => 'This plan is full.',
            'not_open' => 'This plan is no longer open.',
            'women_only' => 'This plan is for women only.',
            'removed' => 'The organiser removed you from this plan.',
            User::BLOCK_NOT_VERIFIED => 'Verify your student account first.',
            User::BLOCK_PROFILE_INCOMPLETE => 'Complete your profile (hall, WhatsApp, gender) first.',
            User::BLOCK_SUSPENDED => 'Your account is suspended.',
            'too_many_pending' => 'You have too many pending requests. Wait for answers or cancel some.',
            default => 'You cannot join this plan.',
        };
    }

    public function join(Plan $plan, User $user, ?string $message = null): PlanRequest
    {
        return DB::transaction(function () use ($plan, $user, $message) {
            $plan->refresh();
            if ($code = $this->joinBlocker($plan, $user)) {
                abort($code === 'women_only' ? 403 : 422, self::blockerMessage($code));
            }

            $pending = PlanRequest::where('user_id', $user->id)->where('status', RequestStatus::Pending)->count();
            if (! $plan->auto_accept && $pending >= config('yenko.requests.max_pending_per_user')) {
                abort(422, self::blockerMessage('too_many_pending'));
            }

            $request = PlanRequest::firstOrNew(['plan_id' => $plan->id, 'user_id' => $user->id]);
            $request->message = $message;

            if ($plan->auto_accept && $plan->seatsLeft() > 0) {
                $request->status = RequestStatus::Accepted;
                $request->responded_at = now();
                $request->save();
                $plan->refreshSeatStatus();
                $plan->user->notify(N::forPlan(N::REQUEST_RECEIVED, $plan, 'New member', "{$user->name} joined \"{$plan->title}\"."));
            } else {
                $request->status = RequestStatus::Pending;
                $request->responded_at = null;
                $request->save();
                $plan->user->notify(N::forPlan(N::REQUEST_RECEIVED, $plan, 'New request', "{$user->name} wants to join \"{$plan->title}\"."));
            }

            return $request;
        });
    }

    public function accept(PlanRequest $request): PlanRequest
    {
        return DB::transaction(function () use ($request) {
            $plan = $request->plan()->lockForUpdate()->first();
            abort_unless($request->status === RequestStatus::Pending, 422, 'This request is no longer pending.');
            abort_unless($plan->isActive() && ! $plan->hasStarted(), 422, 'This plan is no longer active.');
            abort_unless($plan->seatsLeft() > 0, 422, 'No seats left on this plan.');

            $request->update(['status' => RequestStatus::Accepted, 'responded_at' => now()]);
            $plan->refreshSeatStatus();
            $request->user->notify(N::forPlan(N::REQUEST_ACCEPTED, $plan, "You're in!", "You joined \"{$plan->title}\". Time to link up."));

            return $request;
        });
    }

    public function reject(PlanRequest $request): PlanRequest
    {
        abort_unless($request->status === RequestStatus::Pending, 422, 'This request is no longer pending.');
        $request->update(['status' => RequestStatus::Rejected, 'responded_at' => now()]);
        $plan = $request->plan;
        $request->user->notify(N::forPlan(N::REQUEST_REJECTED, $plan, 'Request declined', "Your request for \"{$plan->title}\" was declined."));

        return $request;
    }

    public function remove(PlanRequest $request): PlanRequest
    {
        abort_unless($request->status === RequestStatus::Accepted, 422, 'This person is not a member of the plan.');
        $request->update(['status' => RequestStatus::Removed, 'responded_at' => now()]);
        $plan = $request->plan;
        $plan->refreshSeatStatus();
        $request->user->notify(N::forPlan(N::MEMBER_REMOVED, $plan, 'Removed from plan', "You were removed from \"{$plan->title}\"."));

        return $request;
    }

    public function leave(Plan $plan, User $user): void
    {
        $request = $plan->requestFor($user);
        abort_unless(
            in_array($request?->status, [RequestStatus::Pending, RequestStatus::Accepted], true),
            422,
            'You are not part of this plan.'
        );
        $wasMember = $request->status === RequestStatus::Accepted;
        $request->update(['status' => RequestStatus::Cancelled, 'responded_at' => now()]);

        if ($wasMember) {
            $plan->refreshSeatStatus();
            $plan->user->notify(N::forPlan(N::MEMBER_LEFT, $plan, 'A member left', "{$user->name} left \"{$plan->title}\"."));
        }
    }

    public function cancel(Plan $plan, bool $byAdmin = false): void
    {
        abort_unless($plan->isActive(), 422, 'This plan is no longer active.');

        DB::transaction(function () use ($plan) {
            $recipients = $plan->requests()
                ->whereIn('status', [RequestStatus::Accepted, RequestStatus::Pending])
                ->with('user')->get()->pluck('user')->filter();

            $plan->requests()->where('status', RequestStatus::Pending)->update(['status' => RequestStatus::Expired]);
            $plan->forceFill(['status' => PlanStatus::Cancelled, 'cancelled_at' => now()])->save();

            Notification::send($recipients, N::forPlan(N::PLAN_CANCELLED, $plan, 'Plan cancelled', "\"{$plan->title}\" was cancelled."));
        });
    }

    /** Mark plans that started a while ago as done. Returns the number of plans closed. */
    public function closePastPlans(): int
    {
        $plans = Plan::active()->where('starts_at', '<', now()->subHours(config('yenko.plans.done_after_hours')))->get();

        foreach ($plans as $plan) {
            $plan->requests()->where('status', RequestStatus::Pending)->update(['status' => RequestStatus::Expired]);
            $plan->forceFill(['status' => PlanStatus::Done])->save();
        }

        return $plans->count();
    }

    /** Remind creator and members shortly before the start. Returns the number of plans reminded. */
    public function sendReminders(): int
    {
        $plans = Plan::active()
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [now(), now()->addMinutes(config('yenko.plans.reminder_minutes_before'))])
            ->with(['user', 'acceptedRequests.user'])
            ->get();

        foreach ($plans as $plan) {
            $people = $plan->acceptedRequests->pluck('user')->push($plan->user)->filter();
            $time = $plan->starts_at->format('H:i');
            Notification::send($people, N::forPlan(N::PLAN_REMINDER, $plan, 'Starting soon', "\"{$plan->title}\" starts at {$time}. Meeting point: {$plan->meeting_point}."));
            $plan->forceFill(['reminder_sent_at' => now()])->save();
        }

        return $plans->count();
    }

    /** Clean up everything a user is involved in before their account is deleted. */
    public function detachUser(User $user): void
    {
        foreach ($user->plans()->active()->get() as $plan) {
            $this->cancel($plan);
        }
        $user->planRequests()->whereIn('status', [RequestStatus::Pending, RequestStatus::Accepted])->with('plan')->get()
            ->each(function (PlanRequest $request) use ($user) {
                if ($request->plan->isActive()) {
                    $this->leave($request->plan, $user);
                }
            });
    }
}
