<?php

namespace App\Support;

/** Ghana phone numbers: accepts 0XXXXXXXXX, 233XXXXXXXXX or +233XXXXXXXXX, returns E.164 (+233XXXXXXXXX). */
class Phone
{
    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $input);

        if (preg_match('/^0(\d{9})$/', $digits, $m)) {
            return '+233'.$m[1];
        }
        if (preg_match('/^233(\d{9})$/', $digits, $m)) {
            return '+233'.$m[1];
        }

        return null;
    }

    public static function isValid(?string $input): bool
    {
        return self::normalize($input) !== null;
    }

    /** Digits for a wa.me link (no plus sign). */
    public static function waDigits(string $e164): string
    {
        return ltrim($e164, '+');
    }
}
