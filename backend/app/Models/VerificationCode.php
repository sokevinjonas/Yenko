<?php

namespace App\Models;

use App\Enums\CodePurpose;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationCode extends Model
{
    protected $fillable = ['user_id', 'purpose', 'code_hash', 'attempts', 'expires_at'];

    protected function casts(): array
    {
        return ['purpose' => CodePurpose::class, 'expires_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
