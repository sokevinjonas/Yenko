<?php

namespace App\Enums;

enum CodePurpose: string
{
    case EmailVerification = 'email_verification';
    case PasswordReset = 'password_reset';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return ucfirst(str_replace('_', ' ', $this->value));
    }
}
