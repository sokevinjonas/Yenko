<?php

return [
    // Only student emails with this domain can register.
    'email_domain' => env('YENKO_EMAIL_DOMAIN', 'st.ug.edu.gh'),

    'codes' => [
        'length' => 6,
        'ttl_minutes' => 15,
        'max_attempts' => 5,
        'resend_seconds' => 60,
    ],

    'plans' => [
        'max_active_per_user' => 5,
        'max_days_ahead' => 30,
        'done_after_hours' => 3,
        'reminder_minutes_before' => 60,
        'seats' => ['ride' => 10, 'study' => 50, 'activity' => 50],
    ],

    'requests' => [
        'max_pending_per_user' => 10,
    ],

    'reports' => [
        'auto_suspend_threshold' => 3,
    ],

    // Requests per minute. Auth = login/register/reset attempts per IP + account (brute-force protection).
    'rate_limits' => [
        'auth' => env('YENKO_AUTH_PER_MINUTE', 5),
        'api' => env('YENKO_API_PER_MINUTE', 120),
    ],

    'firebase' => [
        'credentials' => env('FIREBASE_CREDENTIALS'),
    ],
];
