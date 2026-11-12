<?php

use App\Enums\CardStatus;
use App\Filament\Resources\CardVerifications\Pages\ListCardVerifications;
use App\Models\CardVerification;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\Report;
use App\Models\User;
use Filament\Actions\Testing\TestAction;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

it('keeps students out of the admin panel', function () {
    $this->actingAs(User::factory()->participant()->create())->get('/admin')->assertForbidden();
});

it('renders every admin page', function (string $url) {
    $plan = Plan::factory()->create();
    PlanRequest::factory()->for($plan)->create();
    Report::create(['reporter_id' => User::factory()->create()->id, 'reported_user_id' => $plan->user_id, 'reason' => 'scam', 'status' => 'open']);
    CardVerification::create(['user_id' => User::factory()->create()->id, 'photo_path' => 'cards/x.webp']);

    $this->actingAs($this->admin)->get($url)->assertOk();
})->with([
    '/admin', '/admin/users', '/admin/card-verifications', '/admin/plans', '/admin/plan-requests',
    '/admin/reports', '/admin/halls', '/admin/destinations', '/admin/halls/create',
]);

it('approves a student card', function () {
    Storage::fake('local');
    $student = User::factory()->create();
    $card = CardVerification::create(['user_id' => $student->id, 'photo_path' => 'cards/x.webp']);

    $this->actingAs($this->admin);
    Livewire::test(ListCardVerifications::class)
        ->callAction(TestAction::make('approve')->table($card))
        ->assertHasNoErrors();

    expect($card->fresh()->status)->toBe(CardStatus::Approved)
        ->and($student->fresh()->is_verified)->toBeTrue()
        ->and($student->notifications()->count())->toBe(1);
});

it('serves card photos to admins only', function () {
    Storage::fake('local');
    Storage::disk('local')->put('cards/x.webp', 'img');
    $card = CardVerification::create(['user_id' => User::factory()->create()->id, 'photo_path' => 'cards/x.webp']);

    $this->actingAs(User::factory()->create())->get(route('admin.card-photo', $card))->assertForbidden();
    $this->actingAs($this->admin)->get(route('admin.card-photo', $card))->assertOk();
});
