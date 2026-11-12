<?php

namespace Database\Factories;

use App\Models\Hall;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Hall>
 */
class HallFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->unique()->lastName().' Hall', 'is_active' => true, 'sort_order' => 0];
    }
}
