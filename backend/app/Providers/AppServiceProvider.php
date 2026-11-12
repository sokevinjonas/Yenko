<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute((int) config('yenko.rate_limits.auth'))->by(
            $request->ip().'|'.Str::lower((string) ($request->input('login') ?? $request->input('email')))
        ));

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute((int) config('yenko.rate_limits.api'))->by(
            $request->user()?->id ?: $request->ip()
        ));

        JsonResource::withoutWrapping();
    }
}
