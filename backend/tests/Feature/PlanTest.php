<?php

use App\Models\Destination;
use App\Models\Plan;
use App\Models\User;

function ridePayload(array $overrides = []): array
{
    return array_merge([
        'type' => 'ride',
        'title' => 'Legon to Airport',
        'meeting_point' => 'Akuafo Hall gate',
        'starts_at' => now()->addDay()->toIso8601String(),
        'seats_total' => 3,
        'destination_id' => Destination::where('name', 'Kotoka Airport')->value('id'),
        'price_per_person' => 45,
    ], $overrides);
}

it('creates a ride plan', function () {
    actingAsUser();

    $this->postJson('/api/v1/plans', ridePayload())
        ->assertCreated()
        ->assertJsonPath('type', 'ride')
        ->assertJsonPath('destination.name', 'Kotoka Airport')
        ->assertJsonPath('seats_left', 3)
        ->assertJsonPath('viewer.is_creator', true);
});

it('creates study and activity plans without ride fields', function () {
    actingAsUser();

    $this->postJson('/api/v1/plans', ['type' => 'study', 'title' => 'UGBS 201 prep', 'course' => 'UGBS 201',
        'meeting_point' => 'Balme', 'starts_at' => now()->addDay()->toIso8601String(), 'seats_total' => 10, 'price_per_person' => 5])
        ->assertCreated()->assertJsonPath('price_per_person', null)->assertJsonPath('course', 'UGBS 201');

    $this->postJson('/api/v1/plans', ['type' => 'activity', 'title' => 'Football', 'meeting_point' => 'Stadium',
        'starts_at' => now()->addDay()->toIso8601String(), 'seats_total' => 9])
        ->assertJsonValidationErrors('category');
});

it('validates plan rules', function () {
    actingAsUser();
    $this->postJson('/api/v1/plans', ridePayload(['destination_id' => null]))->assertJsonValidationErrors('destination_id');
    $this->postJson('/api/v1/plans', ridePayload(['starts_at' => now()->subHour()->toIso8601String()]))->assertJsonValidationErrors('starts_at');
    $this->postJson('/api/v1/plans', ridePayload(['starts_at' => now()->addDays(31)->toIso8601String()]))->assertJsonValidationErrors('starts_at');
    $this->postJson('/api/v1/plans', ridePayload(['seats_total' => 11]))->assertJsonValidationErrors('seats_total');
    $this->postJson('/api/v1/plans', ridePayload(['whatsapp_group_link' => 'https://evil.com/x']))->assertJsonValidationErrors('whatsapp_group_link');
});

it('blocks unverified, incomplete and suspended users from creating plans', function () {
    actingAsUser(User::factory()->create());
    $this->postJson('/api/v1/plans', ridePayload())->assertForbidden()->assertJsonPath('code', 'not_verified');

    actingAsUser(User::factory()->participant()->create(['whatsapp' => null]));
    $this->postJson('/api/v1/plans', ridePayload())->assertForbidden()->assertJsonPath('code', 'profile_incomplete');

    actingAsUser(User::factory()->participant()->suspended()->create());
    $this->postJson('/api/v1/plans', ridePayload())->assertForbidden()->assertJsonPath('code', 'suspended');
});

it('only lets women create women-only plans', function () {
    actingAsUser(User::factory()->male()->create());
    $this->postJson('/api/v1/plans', ridePayload(['women_only' => true]))->assertJsonValidationErrors('women_only');

    actingAsUser(User::factory()->female()->create());
    $this->postJson('/api/v1/plans', ridePayload(['women_only' => true]))->assertCreated();
});

it('limits active plans per user', function () {
    $user = actingAsUser();
    Plan::factory()->count(5)->for($user)->create();

    $this->postJson('/api/v1/plans', ridePayload())->assertUnprocessable();
});

it('lists open upcoming plans, boosted first, with filters', function () {
    actingAsUser();
    $later = Plan::factory()->create(['starts_at' => now()->addDays(3), 'title' => 'Later ride']);
    $soon = Plan::factory()->create(['starts_at' => now()->addDay(), 'title' => 'Soon ride']);
    $boosted = Plan::factory()->study()->create(['starts_at' => now()->addDays(5), 'title' => 'Boosted study']);
    $boosted->forceFill(['is_boosted' => true])->save();
    Plan::factory()->create(['status' => 'cancelled']);
    Plan::factory()->create(['user_id' => User::factory()->participant()->suspended()]);

    $ids = collect($this->getJson('/api/v1/plans')->assertOk()->json('data'))->pluck('id')->all();
    expect($ids)->toBe([$boosted->id, $soon->id, $later->id]);

    $this->getJson('/api/v1/plans?type=study')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/plans?q=soon')->assertJsonCount(1, 'data');
});

it('never exposes contacts in the list or to strangers', function () {
    actingAsUser();
    $plan = Plan::factory()->create();

    $this->getJson('/api/v1/plans')->assertJsonMissingPath('data.0.contacts');
    $this->getJson("/api/v1/plans/{$plan->id}")
        ->assertOk()
        ->assertJsonMissingPath('contacts')
        ->assertDontSee($plan->user->whatsapp)
        ->assertDontSee($plan->user->email);
});

it('lets the creator edit and cancel a plan', function () {
    $user = actingAsUser();
    $plan = Plan::factory()->for($user)->create();

    $this->putJson("/api/v1/plans/{$plan->id}", ['title' => 'New title', 'seats_total' => 4])
        ->assertOk()->assertJsonPath('title', 'New title')->assertJsonPath('seats_total', 4);
    $this->postJson("/api/v1/plans/{$plan->id}/cancel")->assertOk()->assertJsonPath('status', 'cancelled');

    actingAsUser();
    $other = Plan::factory()->create();
    $this->putJson("/api/v1/plans/{$other->id}", ['title' => 'Hack'])->assertForbidden();
});

it('shows my created, joined and past plans', function () {
    $me = actingAsUser();
    Plan::factory()->for($me)->create();
    $joined = Plan::factory()->create();
    $joined->requests()->create(['user_id' => $me->id, 'status' => 'pending']);
    Plan::factory()->for($me)->create(['status' => 'done', 'starts_at' => now()->subDay()]);

    $this->getJson('/api/v1/me/plans?scope=created')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/me/plans?scope=joined')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/me/plans?scope=past')->assertJsonCount(1, 'data');
});
