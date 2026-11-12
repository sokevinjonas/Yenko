<?php

use App\Enums\CardStatus;
use App\Models\Hall;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('completes the profile and normalises the WhatsApp number', function () {
    actingAsUser(User::factory()->create());
    $hall = Hall::first();

    $this->putJson('/api/v1/me', ['hall_id' => $hall->id, 'whatsapp' => '024 123 4567', 'gender' => 'female'])
        ->assertOk()
        ->assertJsonPath('whatsapp', '+233241234567')
        ->assertJsonPath('profile_complete', true)
        ->assertJsonPath('can_participate', false)
        ->assertJsonPath('participation_blocker', 'not_verified');
});

it('rejects invalid phone numbers', function () {
    actingAsUser(User::factory()->create());
    $this->putJson('/api/v1/me', ['whatsapp' => '12345'])->assertJsonValidationErrors('whatsapp');
});

it('does not let users change their gender once set', function () {
    actingAsUser(User::factory()->male()->create());
    $this->putJson('/api/v1/me', ['gender' => 'female'])->assertJsonValidationErrors('gender');
});

it('uploads a resized avatar', function () {
    Storage::fake('public');
    actingAsUser();

    $this->post('/api/v1/me/avatar', ['avatar' => UploadedFile::fake()->image('me.jpg', 800, 600)], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('avatar_url', fn ($url) => str_contains($url, 'avatars/'));
});

it('sends a student card for review only once', function () {
    Storage::fake('local');
    actingAsUser(User::factory()->create());
    $photo = fn () => ['photo' => UploadedFile::fake()->image('card.jpg', 1000, 700)];

    $this->post('/api/v1/me/card-verification', $photo(), ['Accept' => 'application/json'])
        ->assertCreated()->assertJsonPath('data.status', CardStatus::Pending->value);
    $this->post('/api/v1/me/card-verification', $photo(), ['Accept' => 'application/json'])->assertUnprocessable();
});

it('deletes and anonymises the account', function () {
    $user = actingAsUser();
    $this->deleteJson('/api/v1/me', ['password' => 'password'])->assertOk();

    $user->refresh();
    expect($user->trashed())->toBeTrue()
        ->and($user->student_id)->toBeNull()
        ->and($user->whatsapp)->toBeNull();
});

it('lists halls and destinations', function () {
    $this->getJson('/api/v1/halls')->assertOk()->assertJsonFragment(['name' => 'Commonwealth Hall']);
    $this->getJson('/api/v1/destinations')->assertOk()->assertJsonFragment(['name' => 'Kotoka Airport']);
});
