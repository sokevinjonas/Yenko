<?php

namespace App\Models;

use App\Enums\CardStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardVerification extends Model
{
    protected $fillable = ['user_id', 'photo_path', 'status', 'rejection_reason', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return ['status' => CardStatus::class, 'reviewed_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
