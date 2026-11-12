<?php

namespace App\Enums;

enum PlanStatus: string
{
    case Open = 'open';
    case Full = 'full';
    case Cancelled = 'cancelled';
    case Done = 'done';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
