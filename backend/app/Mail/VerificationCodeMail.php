<?php

namespace App\Mail;

use App\Enums\CodePurpose;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $code, public CodePurpose $purpose) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->purpose === CodePurpose::PasswordReset
            ? 'Your Yenko password reset code'
            : 'Your Yenko verification code');
    }

    public function content(): Content
    {
        return new Content(view: 'mail.verification-code', with: [
            'name' => $this->user->name,
            'code' => $this->code,
            'minutes' => config('yenko.codes.ttl_minutes'),
            'isReset' => $this->purpose === CodePurpose::PasswordReset,
        ]);
    }
}
