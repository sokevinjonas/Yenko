<?php

use App\Models\VerificationCode;
use App\Services\PlanService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('yenko:send-reminders', function (PlanService $plans) {
    $this->info($plans->sendReminders().' plan(s) reminded.');
})->purpose('Remind organisers and members one hour before a plan starts');

Artisan::command('yenko:close-past-plans', function (PlanService $plans) {
    $this->info($plans->closePastPlans().' plan(s) marked as done.');
})->purpose('Mark plans that started a few hours ago as done');

Artisan::command('yenko:prune-codes', function () {
    $this->info(VerificationCode::where('expires_at', '<', now()->subDay())->delete().' code(s) deleted.');
})->purpose('Delete expired verification codes');

Schedule::command('yenko:send-reminders')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('yenko:close-past-plans')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('yenko:prune-codes')->daily();
