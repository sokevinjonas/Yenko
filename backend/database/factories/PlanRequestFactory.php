<?php

namespace Database\Factories;

use App\Enums\RequestStatus;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlanRequest>
 */
class PlanRequestFactory extends Factory
{
    public function definition(): array
    {
        return [
            'plan_id' => Plan::factory(),
            'user_id' => User::factory()->participant(),
            'status' => RequestStatus::Pending,
        ];
    }

    public function accepted(): static
    {
        return $this->state(['status' => RequestStatus::Accepted, 'responded_at' => now()]);
    }
}
