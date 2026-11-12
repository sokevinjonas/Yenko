<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Notifications\YenkoNotification;
use App\Services\FcmService;

class FcmChannel
{
    public function __construct(private FcmService $fcm) {}

    public function send(User $notifiable, YenkoNotification $notification): void
    {
        $payload = $notification->toArray($notifiable);
        $this->fcm->sendToUser($notifiable, $payload['title'], $payload['body'], array_filter([
            'type' => $payload['type'],
            'plan_id' => isset($payload['plan_id']) ? (string) $payload['plan_id'] : null,
        ]));
    }
}
