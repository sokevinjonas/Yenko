<?php

namespace App\Enums;

enum VerificationMethod: string
{
    case Email = 'email';
    case Card = 'card';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
