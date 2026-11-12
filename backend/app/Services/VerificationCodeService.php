<?php

namespace App\Services;

use App\Enums\CodePurpose;
use App\Mail\VerificationCodeMail;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class VerificationCodeService
{
    /** Create a fresh code (invalidating older ones) and email it. */
    public function send(User $user, CodePurpose $purpose): void
    {
        $length = config('yenko.codes.length');
        $code = str_pad((string) random_int(0, 10 ** $length - 1), $length, '0', STR_PAD_LEFT);

        VerificationCode::where('user_id', $user->id)->where('purpose', $purpose)->delete();
        VerificationCode::create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(config('yenko.codes.ttl_minutes')),
        ]);

        Mail::to($user->email)->send(new VerificationCodeMail($user, $code, $purpose));
    }

    /** Seconds the user must still wait before asking for a new code (0 = allowed). */
    public function secondsBeforeResend(User $user, CodePurpose $purpose): int
    {
        $last = VerificationCode::where('user_id', $user->id)->where('purpose', $purpose)->latest('id')->first();
        if (! $last) {
            return 0;
        }
        $wait = config('yenko.codes.resend_seconds') - (int) $last->created_at->diffInSeconds(now(), true);

        return max(0, $wait);
    }

    /**
     * Check a code. Consumes it on success.
     *
     * @throws ValidationException
     */
    public function verify(User $user, CodePurpose $purpose, string $code, string $field = 'code'): void
    {
        $record = VerificationCode::where('user_id', $user->id)->where('purpose', $purpose)->latest('id')->first();

        if (! $record || $record->isExpired()) {
            throw ValidationException::withMessages([$field => 'This code has expired. Request a new one.']);
        }
        if ($record->attempts >= config('yenko.codes.max_attempts')) {
            throw ValidationException::withMessages([$field => 'Too many attempts. Request a new code.']);
        }
        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');
            throw ValidationException::withMessages([$field => 'Wrong code. Check your email and try again.']);
        }

        $record->delete();
    }
}
