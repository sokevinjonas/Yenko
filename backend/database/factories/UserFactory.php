<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Enums\VerificationMethod;
use App\Models\Hall;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        $domain = config('yenko.email_domain');

        return [
            'student_id' => (string) fake()->unique()->numberBetween(10000000, 10999999),
            'name' => fake()->name(),
            'email' => Str::lower(fake()->unique()->userName()).'@'.$domain,
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /** Verified student with a complete profile, able to create and join plans. */
    public function participant(?Gender $gender = null): static
    {
        return $this->state(fn () => [
            'hall_id' => Hall::query()->inRandomOrder()->value('id') ?? Hall::factory(),
            'whatsapp' => '+2332'.fake()->numerify('########'),
            'gender' => $gender ?? fake()->randomElement(Gender::cases()),
        ])->afterMaking(function (User $user) {
            $user->forceFill([
                'is_verified' => true,
                'verification_method' => VerificationMethod::Email,
                'email_verified_at' => now(),
            ]);
        });
    }

    public function female(): static
    {
        return $this->participant(Gender::Female);
    }

    public function male(): static
    {
        return $this->participant(Gender::Male);
    }

    public function admin(): static
    {
        return $this->afterMaking(fn (User $user) => $user->forceFill(['is_admin' => true]));
    }

    public function suspended(): static
    {
        return $this->afterMaking(fn (User $user) => $user->forceFill(['is_suspended' => true, 'suspended_at' => now()]));
    }
}
