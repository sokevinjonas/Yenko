<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Firebase Cloud Messaging (HTTP v1). Disabled until FIREBASE_CREDENTIALS points to a
 * service-account JSON file. No extra package needed: the OAuth token is signed with openssl.
 */
class FcmService
{
    public function enabled(): bool
    {
        $path = config('yenko.firebase.credentials');

        return filled($path) && is_readable($path);
    }

    /** @param  array<string, string>  $data */
    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        if (! $this->enabled()) {
            return;
        }

        try {
            $credentials = json_decode(file_get_contents(config('yenko.firebase.credentials')), true, flags: JSON_THROW_ON_ERROR);
            $accessToken = $this->accessToken($credentials);
            $url = "https://fcm.googleapis.com/v1/projects/{$credentials['project_id']}/messages:send";

            foreach ($user->deviceTokens as $device) {
                $response = Http::withToken($accessToken)->post($url, ['message' => [
                    'token' => $device->token,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data' => array_map('strval', $data),
                ]]);

                if ($response->status() === 404 || $response->json('error.status') === 'UNREGISTERED') {
                    $device->delete(); // stale token
                } elseif ($response->successful()) {
                    DeviceToken::whereKey($device->id)->update(['last_used_at' => now()]);
                }
            }
        } catch (Throwable $e) {
            Log::warning('FCM push failed: '.$e->getMessage());
        }
    }

    private function accessToken(array $credentials): string
    {
        return Cache::remember('fcm_access_token', 3300, function () use ($credentials) {
            $now = time();
            $encode = fn (array $part) => rtrim(strtr(base64_encode(json_encode($part)), '+/', '-_'), '=');
            $unsigned = $encode(['alg' => 'RS256', 'typ' => 'JWT']).'.'.$encode([
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $now,
                'exp' => $now + 3600,
            ]);
            openssl_sign($unsigned, $signature, $credentials['private_key'], 'sha256WithRSAEncryption');
            $jwt = $unsigned.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

            return Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ])->throw()->json('access_token');
        });
    }
}
