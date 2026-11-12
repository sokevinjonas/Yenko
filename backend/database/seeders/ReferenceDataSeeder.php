<?php

namespace Database\Seeders;

use App\Enums\DestinationZone;
use App\Models\Destination;
use App\Models\Hall;
use Illuminate\Database\Seeder;

/** Halls and destinations — safe to run several times; editable in the admin panel. */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $halls = [
            'Commonwealth Hall', 'Legon Hall', 'Akuafo Hall', 'Mensah Sarbah Hall', 'Volta Hall',
            'Elizabeth Frances Sey Hall', 'Hilla Limann Hall', 'Jean Nelson Aka Hall',
            'Alexander Kwapong Hall', 'Jubilee Hall', 'Pent Hall', 'Bani Hall', 'Off-campus / Other',
        ];
        foreach ($halls as $i => $name) {
            Hall::firstOrCreate(['name' => $name], ['sort_order' => $i]);
        }

        $offCampus = [
            'Madina', 'Accra Mall', 'Kotoka Airport', 'Kwame Nkrumah Circle', 'Osu', 'East Legon', 'Shiashie',
            'Achimota Mall', 'Kaneshie', 'Spintex', 'Tema', 'Atomic Junction', 'Okponglo',
            'VIP Bus Station (Circle)', 'STC Station',
        ];
        $campus = ['Main Gate', 'Night Market', 'Balme Library', 'Great Hall', 'UGBS', 'Sports Stadium'];

        foreach ($offCampus as $i => $name) {
            Destination::firstOrCreate(['name' => $name], ['zone' => DestinationZone::OffCampus, 'sort_order' => $i]);
        }
        foreach ($campus as $i => $name) {
            Destination::firstOrCreate(['name' => $name], ['zone' => DestinationZone::Campus, 'sort_order' => 100 + $i]);
        }
    }
}
