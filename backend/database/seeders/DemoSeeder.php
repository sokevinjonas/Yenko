<?php

namespace Database\Seeders;

use App\Enums\ActivityCategory;
use App\Enums\PlanType;
use App\Models\Destination;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Demo data for local development: `php artisan db:seed --class=DemoSeeder`. Password: "password". */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $kofi = User::factory()->male()->create(['name' => 'Kofi Mensah', 'email' => 'kofi@'.config('yenko.email_domain'), 'student_id' => '10900001']);
        $ama = User::factory()->female()->create(['name' => 'Ama Owusu', 'email' => 'ama@'.config('yenko.email_domain'), 'student_id' => '10900002']);
        $kwame = User::factory()->male()->create(['name' => 'Kwame Asante', 'email' => 'kwame@'.config('yenko.email_domain'), 'student_id' => '10900003']);
        $others = User::factory()->participant()->count(6)->create();

        $airport = Destination::where('name', 'Kotoka Airport')->first();
        $mall = Destination::where('name', 'Accra Mall')->first();
        $madina = Destination::where('name', 'Madina')->first();

        $p1 = Plan::factory()->for($ama)->womenOnly()->create([
            'title' => 'Legon → Kotoka Airport', 'destination_id' => $airport->id, 'meeting_point' => 'Akuafo Hall gate',
            'starts_at' => now()->addDays(3)->setTime(6, 30), 'price_per_person' => 45, 'seats_total' => 3,
        ]);
        Plan::factory()->for($kofi)->autoAccept()->create([
            'title' => 'Friday chill at Accra Mall', 'destination_id' => $mall->id, 'meeting_point' => 'Commonwealth Hall',
            'starts_at' => now()->addDays(1)->setTime(17, 0), 'price_per_person' => 15, 'seats_total' => 3,
        ]);
        Plan::factory()->for($others[0])->create([
            'title' => 'Bolt to Madina market', 'destination_id' => $madina->id, 'meeting_point' => 'Night Market',
            'starts_at' => now()->addHours(20), 'price_per_person' => 10, 'seats_total' => 2,
        ]);
        $p4 = Plan::factory()->for($kwame)->study()->create([
            'title' => 'UGBS 201 — Exam prep', 'course' => 'UGBS 201', 'meeting_point' => 'Balme Library, 2nd floor',
            'starts_at' => now()->addDays(2)->setTime(16, 0), 'seats_total' => 6,
        ]);
        Plan::factory()->for($others[1])->activity()->create([
            'type' => PlanType::Activity, 'category' => ActivityCategory::Football, 'title' => '5-a-side football',
            'meeting_point' => 'Sports Stadium', 'starts_at' => now()->addDays(4)->setTime(17, 0), 'seats_total' => 9,
        ]);

        PlanRequest::factory()->for($p4)->for($kofi)->accepted()->create();
        PlanRequest::factory()->for($p4)->for($others[2])->create(['message' => 'Can I join? I have the past questions.']);
        PlanRequest::factory()->for($p1)->for($others->firstWhere('gender', \App\Enums\Gender::Female) ?? $ama)->create();
    }
}
