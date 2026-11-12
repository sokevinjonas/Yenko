<?php

namespace App\Notifications;

use App\Models\Plan;
use App\Notifications\Channels\FcmChannel;
use App\Services\FcmService;
use Illuminate\Notifications\Notification;

/**
 * One notification class for every in-app event. Stored in the database (bell in the app)
 * and pushed through FCM when it is configured.
 */
class YenkoNotification extends Notification
{
    public const REQUEST_RECEIVED = 'request_received';

    public const REQUEST_ACCEPTED = 'request_accepted';

    public const REQUEST_REJECTED = 'request_rejected';

    public const MEMBER_REMOVED = 'member_removed';

    public const MEMBER_LEFT = 'member_left';

    public const PLAN_CANCELLED = 'plan_cancelled';

    public const PLAN_REMINDER = 'plan_reminder';

    public const CARD_APPROVED = 'card_approved';

    public const CARD_REJECTED = 'card_rejected';

    public const ACCOUNT_SUSPENDED = 'account_suspended';

    public function __construct(
        public string $type,
        public string $title,
        public string $body,
        public ?int $planId = null,
    ) {}

    public static function forPlan(string $type, Plan $plan, string $title, string $body): self
    {
        return new self($type, $title, $body, $plan->id);
    }

    public function via(object $notifiable): array
    {
        return app(FcmService::class)->enabled() ? ['database', FcmChannel::class] : ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return array_filter([
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'plan_id' => $this->planId,
        ], fn ($v) => $v !== null);
    }
}
