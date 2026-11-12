<?php

namespace App\Enums;

enum ReportReason: string
{
    case WrongNumber = 'wrong_number';
    case Harassment = 'harassment';
    case NoShow = 'no_show';
    case Scam = 'scam';
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
