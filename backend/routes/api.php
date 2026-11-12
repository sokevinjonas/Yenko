<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CardVerificationController;
use App\Http\Controllers\Api\V1\DeviceTokenController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PlanController;
use App\Http\Controllers\Api\V1\PlanRequestController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\ReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---- Public ------------------------------------------------------------
    Route::middleware('throttle:auth')->prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });

    Route::middleware('throttle:api')->group(function () {
        Route::get('halls', [ReferenceController::class, 'halls']);
        Route::get('destinations', [ReferenceController::class, 'destinations']);
    });

    // ---- Authenticated -----------------------------------------------------
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/verify-email', [AuthController::class, 'verifyEmail']);
        Route::post('auth/resend-code', [AuthController::class, 'resendCode']);

        Route::get('me', [ProfileController::class, 'show']);
        Route::put('me', [ProfileController::class, 'update']);
        Route::post('me/avatar', [ProfileController::class, 'avatar']);
        Route::put('me/password', [ProfileController::class, 'password']);
        Route::delete('me', [ProfileController::class, 'destroy']);
        Route::get('me/card-verification', [CardVerificationController::class, 'show']);
        Route::post('me/card-verification', [CardVerificationController::class, 'store']);
        Route::get('me/plans', [PlanController::class, 'mine']);

        Route::get('plans', [PlanController::class, 'index']);
        Route::get('plans/{plan}', [PlanController::class, 'show']);
        Route::put('plans/{plan}', [PlanController::class, 'update']);
        Route::post('plans/{plan}/cancel', [PlanController::class, 'cancel']);
        Route::post('plans/{plan}/leave', [PlanRequestController::class, 'leave']);
        Route::get('plans/{plan}/requests', [PlanRequestController::class, 'index']);
        Route::post('requests/{planRequest}/accept', [PlanRequestController::class, 'accept']);
        Route::post('requests/{planRequest}/reject', [PlanRequestController::class, 'reject']);
        Route::post('requests/{planRequest}/remove', [PlanRequestController::class, 'remove']);

        Route::middleware('participant')->group(function () {
            Route::post('plans', [PlanController::class, 'store']);
            Route::post('plans/{plan}/join', [PlanRequestController::class, 'join']);
        });

        Route::post('reports', [ReportController::class, 'store']);

        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'read']);

        Route::post('device-tokens', [DeviceTokenController::class, 'store']);
        Route::delete('device-tokens', [DeviceTokenController::class, 'destroy']);
    });
});
