<?php

namespace Database\Factories;

use App\Enums\DestinationZone;
use App\Models\Destination;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Destination>
 */
class DestinationFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->unique()->city(), 'zone' => DestinationZone::OffCampus, 'is_active' => true, 'sort_order' => 0];
    }
}
