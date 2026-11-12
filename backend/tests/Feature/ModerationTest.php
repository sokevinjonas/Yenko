<?php

use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use App\Notifications\YenkoNotification;
use App\Services\PlanService;

it('suspends a user after three different reports', function () {
    $target = User::factory()->participant()->create();

    foreach (range(1, 3) as $i) {
        actingAsUser();
        $this->postJson('/api/v1/reports', ['reported_user_id' => $target->id, 'reason' => 'wrong_number'])->assertCreated();
    }

    expect($target->fresh()->is_suspended)->toBeTrue();
});

it('refuses duplicate and self reports', function () {
    $me = actingAsUser();
    $target = User::factory()->create();

    $this->postJson('/api/v1/reports', ['reported_user_id' => $target->id, 'reason' => 'scam'])->assertCreated();
    $this->postJson('/api/v1/reports', ['reported_user_id' => $target->id, 'reason' => 'scam'])->assertUnprocessable();
    $this->postJson('/api/v1/reports', ['reported_user_id' => $me->id, 'reason' => 'scam'])->assertUnprocessable();
});

it('closes past plans and expires pending requests', function () {
    $plan = Plan::factory()->create(['starts_at' => now()->subHours(4)]);
    $request = PlanRequest::factory()->for($plan)->create();

    expect(app(PlanService::class)->closePastPlans())->toBe(1)
        ->and($plan->fresh()->status->value)->toBe('done')
        ->and($request->fresh()->status->value)->toBe('expired');
});

it('sends reminders once, one hour before', function () {
    $plan = Plan::factory()->create(['starts_at' => now()->addMinutes(30)]);
    $member = PlanRequest::factory()->for($plan)->accepted()->create()->user;

    $this->artisan('yenko:send-reminders')->assertSuccessful();
    $this->artisan('yenko:send-reminders')->assertSuccessful();

    expect($member->notifications()->count())->toBe(1)
        ->and($plan->user->notifications()->count())->toBe(1);
});

it('lists and reads notifications', function () {
    $plan = Plan::factory()->create();
    actingAsUser($plan->user);
    PlanRequest::factory()->for($plan)->create();
    app(PlanService::class)->join(Plan::factory()->create(), User::factory()->participant()->create());
    $plan->user->notify(new YenkoNotification('request_received', 'Hi', 'Body', $plan->id));

    $this->getJson('/api/v1/notifications/unread-count')->assertJsonPath('count', 1);
    $id = $this->getJson('/api/v1/notifications')->assertOk()->json('data.0.id');
    $this->postJson("/api/v1/notifications/{$id}/read")->assertOk();
    $this->getJson('/api/v1/notifications/unread-count')->assertJsonPath('count', 0);
});

it('registers device tokens', function () {
    $user = actingAsUser();
    $this->postJson('/api/v1/device-tokens', ['token' => 'abc123', 'platform' => 'android'])->assertCreated();
    expect($user->deviceTokens()->count())->toBe(1);
    $this->deleteJson('/api/v1/device-tokens', ['token' => 'abc123'])->assertOk();
    expect($user->deviceTokens()->count())->toBe(0);
});
