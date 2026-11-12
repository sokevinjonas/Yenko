<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('destinations', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('zone')->default('off_campus');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'purpose']);
        });

        Schema::create('card_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('photo_path');
            $table->string('status')->default('pending');
            $table->string('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index('status');
        });

        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('title', 80);
            $table->text('description')->nullable();
            $table->foreignId('destination_id')->nullable()->constrained()->nullOnDelete();
            $table->string('course', 60)->nullable();
            $table->string('category')->nullable();
            $table->string('meeting_point', 120);
            $table->dateTime('starts_at');
            $table->unsignedSmallInteger('seats_total');
            $table->decimal('price_per_person', 8, 2)->nullable();
            $table->boolean('women_only')->default(false);
            $table->boolean('auto_accept')->default(false);
            $table->string('whatsapp_group_link')->nullable();
            $table->string('status')->default('open');
            $table->boolean('is_boosted')->default(false);
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'starts_at']);
            $table->index('type');
        });

        Schema::create('plan_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->string('message', 200)->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->unique(['plan_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->string('status')->default('open');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['reported_user_id', 'status']);
        });

        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('platform')->default('web');
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('plan_requests');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('card_verifications');
        Schema::dropIfExists('verification_codes');
        Schema::dropIfExists('destinations');
    }
};
