<?php

use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => $this->seed(ReferenceDataSeeder::class))
    ->in('Feature', 'Unit');

function actingAsUser(?User $user = null): User
{
    $user ??= User::factory()->participant()->create();
    Sanctum::actingAs($user);

    return $user;
}

function studentEmail(string $local): string
{
    return $local.'@'.config('yenko.email_domain');
}
