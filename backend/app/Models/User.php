<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\VerificationMethod;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser, HasName
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public const BLOCK_NOT_VERIFIED = 'not_verified';
    public const BLOCK_PROFILE_INCOMPLETE = 'profile_incomplete';
    public const BLOCK_SUSPENDED = 'suspended';

    protected $fillable = [
        'student_id', 'name', 'email', 'password', 'hall_id', 'whatsapp', 'gender',
        'avatar_path', 'bio',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'suspended_at' => 'datetime',
            'password' => 'hashed',
            'gender' => Gender::class,
            'verification_method' => VerificationMethod::class,
            'is_verified' => 'boolean',
            'is_admin' => 'boolean',
            'is_suspended' => 'boolean',
        ];
    }

    // ---- Relations -------------------------------------------------------

    public function hall(): BelongsTo
    {
        return $this->belongsTo(Hall::class);
    }

    public function plans(): HasMany
    {
        return $this->hasMany(Plan::class);
    }

    public function planRequests(): HasMany
    {
        return $this->hasMany(PlanRequest::class);
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    public function cardVerifications(): HasMany
    {
        return $this->hasMany(CardVerification::class);
    }

    public function reportsReceived(): HasMany
    {
        return $this->hasMany(Report::class, 'reported_user_id');
    }

    public function reportsSent(): HasMany
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    // ---- State helpers ---------------------------------------------------

    public function isProfileComplete(): bool
    {
        return $this->hall_id !== null && filled($this->whatsapp) && $this->gender !== null;
    }

    /** Why this user cannot create/join plans, or null when allowed. */
    public function participationBlocker(): ?string
    {
        return match (true) {
            $this->is_suspended => self::BLOCK_SUSPENDED,
            ! $this->is_verified => self::BLOCK_NOT_VERIFIED,
            ! $this->isProfileComplete() => self::BLOCK_PROFILE_INCOMPLETE,
            default => null,
        };
    }

    public function canParticipate(): bool
    {
        return $this->participationBlocker() === null;
    }

    public function isFemale(): bool
    {
        return $this->gender === Gender::Female;
    }

    public function markVerified(VerificationMethod $method): void
    {
        $this->forceFill([
            'is_verified' => true,
            'verification_method' => $method,
            'email_verified_at' => $method === VerificationMethod::Email ? now() : $this->email_verified_at,
        ])->save();
    }

    public function suspend(?string $reason = null): void
    {
        $this->forceFill([
            'is_suspended' => true,
            'suspended_at' => now(),
            'suspension_reason' => $reason,
        ])->save();
    }

    public function unsuspend(): void
    {
        $this->forceFill([
            'is_suspended' => false,
            'suspended_at' => null,
            'suspension_reason' => null,
        ])->save();
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null;
    }

    /** Anonymise personal data when the account is deleted. */
    public function anonymiseAndDelete(): void
    {
        if ($this->avatar_path) {
            Storage::disk('public')->delete($this->avatar_path);
        }
        $this->tokens()->delete();
        $this->deviceTokens()->delete();
        $this->forceFill([
            'name' => 'Deleted user',
            'email' => 'deleted-'.$this->id.'@deleted.yenko',
            'student_id' => null,
            'whatsapp' => null,
            'avatar_path' => null,
            'bio' => null,
        ])->save();
        $this->delete();
    }

    // ---- Filament --------------------------------------------------------

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->is_admin && ! $this->trashed();
    }

    public function getFilamentName(): string
    {
        return $this->name;
    }
}
