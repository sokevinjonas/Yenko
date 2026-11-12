<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanRequest extends Model
{
    use HasFactory;

    protected $fillable = ['plan_id', 'user_id', 'status', 'message', 'responded_at'];

    protected function casts(): array
    {
        return ['status' => RequestStatus::class, 'responded_at' => 'datetime'];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
