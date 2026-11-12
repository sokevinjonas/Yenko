<?php

use App\Mail\VerificationCodeMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

function registerPayload(array $overrides = []): array
{
    return array_merge([
        'student_id' => '10812345',
        'name' => 'Kofi Mensah',
        'email' => studentEmail('kofi.mensah'),
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ], $overrides);
}

function sentCode(): string
{
    $code = null;
    Mail::assertSent(VerificationCodeMail::class, function ($mail) use (&$code) {
        $code = $mail->code;

        return true;
    });

    return $code;
}

it('registers a student and emails a code', function () {
    Mail::fake();

    $this->postJson('/api/v1/auth/register', registerPayload())
        ->assertCreated()
        ->assertJsonStructure(['token', 'user' => ['id', 'student_id', 'email']])
        ->assertJsonPath('user.is_verified', false);

    expect(strlen(sentCode()))->toBe(6);
});

it('refuses non student emails', function () {
    $this->postJson('/api/v1/auth/register', registerPayload(['email' => 'kofi@gmail.com']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('refuses duplicate student IDs and bad formats', function () {
    User::factory()->create(['student_id' => '10812345']);
    $this->postJson('/api/v1/auth/register', registerPayload())->assertJsonValidationErrors('student_id');
    $this->postJson('/api/v1/auth/register', registerPayload(['student_id' => 'abc']))->assertJsonValidationErrors('student_id');
});

it('verifies the email with the code', function () {
    Mail::fake();
    $token = $this->postJson('/api/v1/auth/register', registerPayload())->json('token');
    $code = sentCode();

    $this->withToken($token)->postJson('/api/v1/auth/verify-email', ['code' => $code === '000000' ? '111111' : '000000'])
        ->assertJsonValidationErrors('code');

    $this->withToken($token)->postJson('/api/v1/auth/verify-email', ['code' => $code])
        ->assertOk()
        ->assertJsonPath('is_verified', true)
        ->assertJsonPath('verification_method', 'email');
});

it('blocks the code after too many attempts', function () {
    Mail::fake();
    $token = $this->postJson('/api/v1/auth/register', registerPayload())->json('token');
    $code = sentCode();
    $wrong = $code === '000000' ? '111111' : '000000';

    foreach (range(1, 5) as $i) {
        $this->withToken($token)->postJson('/api/v1/auth/verify-email', ['code' => $wrong]);
    }
    $this->withToken($token)->postJson('/api/v1/auth/verify-email', ['code' => $code])
        ->assertJsonValidationErrors(['code' => 'Too many attempts']);
});

it('limits code resends', function () {
    Mail::fake();
    $token = $this->postJson('/api/v1/auth/register', registerPayload())->json('token');

    $this->withToken($token)->postJson('/api/v1/auth/resend-code')->assertStatus(429);
    $this->travel(61)->seconds();
    $this->withToken($token)->postJson('/api/v1/auth/resend-code')->assertOk();
});

it('logs in with email or student ID', function () {
    User::factory()->create(['student_id' => '10855555', 'email' => studentEmail('ama'), 'password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', ['login' => studentEmail('ama'), 'password' => 'secret123'])->assertOk()->assertJsonStructure(['token']);
    $this->postJson('/api/v1/auth/login', ['login' => '10855555', 'password' => 'secret123'])->assertOk();
    $this->postJson('/api/v1/auth/login', ['login' => '10855555', 'password' => 'nope'])->assertJsonValidationErrors('login');
});

it('resets a forgotten password', function () {
    Mail::fake();
    $user = User::factory()->create(['email' => studentEmail('yaw'), 'password' => 'oldpass123']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => studentEmail('yaw')])->assertOk();
    $this->postJson('/api/v1/auth/forgot-password', ['email' => studentEmail('nobody')])->assertOk();

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => studentEmail('yaw'), 'code' => sentCode(), 'password' => 'newpass123', 'password_confirmation' => 'newpass123',
    ])->assertOk();

    $this->postJson('/api/v1/auth/login', ['login' => studentEmail('yaw'), 'password' => 'newpass123'])->assertOk();
});

it('requires authentication', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});
