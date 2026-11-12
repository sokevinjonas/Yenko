<?php

namespace Database\Factories;

use App\Enums\ActivityCategory;
use App\Enums\PlanStatus;
use App\Enums\PlanType;
use App\Models\Destination;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->participant(),
            'type' => PlanType::Ride,
            'title' => 'Ride to '.fake()->city(),
            'description' => null,
            'destination_id' => Destination::factory(),
            'meeting_point' => 'Main Gate',
            'starts_at' => now()->addDays(2)->setTime(9, 0),
            'seats_total' => 3,
            'price_per_person' => 30,
            'women_only' => false,
            'auto_accept' => false,
            'whatsapp_group_link' => 'https://chat.whatsapp.com/ABCDEF123456',
            'status' => PlanStatus::Open,
        ];
    }

    public function study(): static
    {
        return $this->state(fn () => [
            'type' => PlanType::Study, 'title' => 'Exam prep', 'destination_id' => null,
            'course' => 'UGBS 201', 'price_per_person' => null, 'seats_total' => 8, 'meeting_point' => 'Balme Library',
        ]);
    }

    public function activity(): static
    {
        return $this->state(fn () => [
            'type' => PlanType::Activity, 'title' => '5-a-side football', 'destination_id' => null,
            'category' => ActivityCategory::Football, 'price_per_person' => null, 'seats_total' => 9, 'meeting_point' => 'Sports Stadium',
        ]);
    }

    public function autoAccept(): static
    {
        return $this->state(['auto_accept' => true]);
    }

    public function womenOnly(): static
    {
        return $this->state(['women_only' => true]);
    }
}
