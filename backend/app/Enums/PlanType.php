<?php

namespace App\Enums;

enum PlanType: string
{
    case Ride = 'ride';
    case Study = 'study';
    case Activity = 'activity';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
