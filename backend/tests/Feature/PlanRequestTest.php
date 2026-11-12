<?php

use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;

it('sends a join request and notifies the organiser', function () {
    $plan = Plan::factory()->create();
    actingAsUser();

    $this->postJson("/api/v1/plans/{$plan->id}/join", ['message' => 'Hi!'])
        ->assertOk()
        ->assertJsonPath('viewer.request_status', 'pending')
        ->assertJsonMissingPath('contacts');

    expect($plan->user->notifications()->count())->toBe(1);
});

it('auto accepts when the plan allows it and fills up', function () {
    $plan = Plan::factory()->autoAccept()->create(['seats_total' => 1]);
    actingAsUser();

    $this->postJson("/api/v1/plans/{$plan->id}/join")
        ->assertOk()
        ->assertJsonPath('viewer.request_status', 'accepted')
        ->assertJsonPath('status', 'full')
        ->assertJsonPath('contacts.creator_whatsapp', $plan->user->whatsapp)
        ->assertJsonPath('contacts.whatsapp_group_link', $plan->whatsapp_group_link);

    actingAsUser();
    $this->postJson("/api/v1/plans/{$plan->id}/join")->assertUnprocessable()->assertJsonPath('message', 'This plan is full.');
});

it('rejects invalid joins', function () {
    $me = actingAsUser();
    $mine = Plan::factory()->for($me)->create();
    $this->postJson("/api/v1/plans/{$mine->id}/join")->assertUnprocessable();

    $plan = Plan::factory()->create();
    $this->postJson("/api/v1/plans/{$plan->id}/join")->assertOk();
    $this->postJson("/api/v1/plans/{$plan->id}/join")->assertUnprocessable();

    $started = Plan::factory()->create(['starts_at' => now()->subMinute()]);
    $this->postJson("/api/v1/plans/{$started->id}/join")->assertUnprocessable();
});

it('keeps women-only plans for women', function () {
    $plan = Plan::factory()->womenOnly()->create(['user_id' => User::factory()->female()]);

    actingAsUser(User::factory()->male()->create());
    $this->postJson("/api/v1/plans/{$plan->id}/join")->assertForbidden();

    actingAsUser(User::factory()->female()->create());
    $this->postJson("/api/v1/plans/{$plan->id}/join")->assertOk();
});

it('lets the organiser accept, see the contact, and remove a member', function () {
    $owner = User::factory()->participant()->create();
    $plan = Plan::factory()->for($owner)->create(['seats_total' => 1]);
    $member = User::factory()->participant()->create();
    $request = PlanRequest::factory()->for($plan)->for($member)->create();

    actingAsUser($owner);
    $this->getJson("/api/v1/plans/{$plan->id}/requests")->assertOk()->assertJsonPath('0.user.whatsapp', null);

    $this->postJson("/api/v1/requests/{$request->id}/accept")->assertOk()->assertJsonPath('user.whatsapp', $member->whatsapp);
    expect($plan->fresh()->status->value)->toBe('full');

    $this->getJson("/api/v1/plans/{$plan->id}")->assertJsonPath('contacts.members.0.whatsapp', $member->whatsapp);

    $this->postJson("/api/v1/requests/{$request->id}/remove")->assertOk();
    expect($plan->fresh()->status->value)->toBe('open');
    expect($member->notifications()->count())->toBe(2);

    actingAsUser($member);
    $this->postJson("/api/v1/plans/{$plan->id}/join")->assertUnprocessable();
});

it('does not accept beyond the seats', function () {
    $owner = User::factory()->participant()->create();
    $plan = Plan::factory()->for($owner)->create(['seats_total' => 1]);
    PlanRequest::factory()->for($plan)->accepted()->create();
    $plan->refreshSeatStatus();
    $pending = PlanRequest::factory()->for($plan)->create();

    actingAsUser($owner);
    $this->postJson("/api/v1/requests/{$pending->id}/accept")->assertUnprocessable();
});

it('only lets the organiser manage requests', function () {
    $request = PlanRequest::factory()->create();
    actingAsUser();

    $this->postJson("/api/v1/requests/{$request->id}/accept")->assertForbidden();
    $this->getJson("/api/v1/plans/{$request->plan_id}/requests")->assertForbidden();
});

it('lets a member leave and frees the seat', function () {
    $plan = Plan::factory()->create(['seats_total' => 1]);
    $member = actingAsUser();
    PlanRequest::factory()->for($plan)->for($member)->accepted()->create();
    $plan->refreshSeatStatus();

    $this->postJson("/api/v1/plans/{$plan->id}/leave")->assertOk()->assertJsonPath('status', 'open')->assertJsonMissingPath('contacts');
    expect($plan->user->notifications()->count())->toBe(1);
});

it('notifies members when a plan is cancelled', function () {
    $owner = User::factory()->participant()->create();
    $plan = Plan::factory()->for($owner)->create();
    $member = PlanRequest::factory()->for($plan)->accepted()->create()->user;
    $pending = PlanRequest::factory()->for($plan)->create();

    actingAsUser($owner);
    $this->postJson("/api/v1/plans/{$plan->id}/cancel")->assertOk();

    expect($member->notifications()->count())->toBe(1)
        ->and($pending->fresh()->status->value)->toBe('expired');
});
