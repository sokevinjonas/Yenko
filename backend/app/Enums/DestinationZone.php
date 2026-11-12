<?php

namespace App\Enums;

enum DestinationZone: string
{
    case Campus = 'campus';
    case OffCampus = 'off_campus';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
