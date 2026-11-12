<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CodePurpose;
use App\Enums\VerificationMethod;
use App\Http\Controllers\Controller;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\VerificationCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private VerificationCodeService $codes) {}

    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);
        $domain = config('yenko.email_domain');

        $data = $request->validate([
            'student_id' => ['required', 'string', 'regex:/^\d{8,10}$/', 'unique:users,student_id'],
            'name' => ['required', 'string', 'min:2', 'max:60'],
            'email' => ['required', 'email', 'max:120', 'ends_with:@'.$domain, 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'student_id.regex' => 'Your student ID should be 8 to 10 digits.',
            'student_id.unique' => 'An account already exists with this student ID.',
            'email.ends_with' => "Use your student email (@{$domain}).",
            'email.unique' => 'An account already exists with this email.',
        ]);

        $user = User::create($data);
        $this->codes->send($user, CodePurpose::EmailVerification);

        return response()->json([
            'token' => $user->createToken($this->deviceName($request))->plainTextToken,
            'user' => new MeResource($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);
        $login = trim($data['login']);

        $user = User::where('email', Str::lower($login))->orWhere('student_id', $login)->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['login' => 'Wrong student ID/email or password.']);
        }

        return response()->json([
            'token' => $user->createToken($this->deviceName($request))->plainTextToken,
            'user' => new MeResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function verifyEmail(Request $request): MeResource
    {
        $user = $request->user();
        $data = $request->validate(['code' => ['required', 'digits:'.config('yenko.codes.length')]]);

        if ($user->email_verified_at === null) {
            $this->codes->verify($user, CodePurpose::EmailVerification, $data['code']);
            $user->markVerified(VerificationMethod::Email);
        }

        return new MeResource($user->fresh());
    }

    public function resendCode(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user->email_verified_at !== null, 422, 'Your email is already verified.');

        if ($wait = $this->codes->secondsBeforeResend($user, CodePurpose::EmailVerification)) {
            return response()->json(['message' => "Please wait {$wait} seconds before asking for a new code.", 'retry_after' => $wait], 429);
        }
        $this->codes->send($user, CodePurpose::EmailVerification);

        return response()->json(['message' => 'A new code was sent to your email.', 'retry_after' => config('yenko.codes.resend_seconds')]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', Str::lower($data['email']))->first();

        if ($user && $this->codes->secondsBeforeResend($user, CodePurpose::PasswordReset) === 0) {
            $this->codes->send($user, CodePurpose::PasswordReset);
        }

        // Same answer whether the account exists or not.
        return response()->json(['message' => 'If an account exists for this email, a reset code was sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:'.config('yenko.codes.length')],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        $user = User::where('email', Str::lower($data['email']))->first();

        if (! $user) {
            throw ValidationException::withMessages(['code' => 'Wrong code. Check your email and try again.']);
        }
        $this->codes->verify($user, CodePurpose::PasswordReset, $data['code']);

        $user->forceFill(['password' => $data['password']])->save();
        $user->tokens()->delete();

        return response()->json(['message' => 'Password updated. You can now log in.']);
    }

    private function deviceName(Request $request): string
    {
        return Str::limit((string) ($request->input('device_name') ?: $request->userAgent() ?: 'app'), 60, '');
    }
}
