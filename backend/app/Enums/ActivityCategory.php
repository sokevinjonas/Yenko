<?php

namespace App\Enums;

enum ActivityCategory: string
{
    case Football = 'football';
    case Basketball = 'basketball';
    case Outing = 'outing';
    case Party = 'party';
    case Gym = 'gym';
    case Other = 'other';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
