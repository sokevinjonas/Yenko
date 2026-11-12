<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

#[Signature('yenko:admin {email?} {--name=} {--password=}')]
#[Description('Create an admin account for the Filament panel (or promote an existing user)')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $email = Str::lower($this->argument('email') ?? text('Admin email', required: true));
        $user = User::where('email', $email)->first();

        if ($user) {
            $user->forceFill(['is_admin' => true])->save();
            $this->info("{$email} is now an admin.");

            return self::SUCCESS;
        }

        $name = $this->option('name') ?? text('Name', default: 'Yenko Admin');
        $pass = $this->option('password') ?? password('Password (min 8 characters)', required: true);

        if (strlen($pass) < 8) {
            $this->error('The password must have at least 8 characters.');

            return self::FAILURE;
        }

        $user = User::create(['name' => $name, 'email' => $email, 'password' => $pass]);
        $user->forceFill(['is_admin' => true, 'email_verified_at' => now()])->save();
        $this->info("Admin {$email} created. Log in at ".url('/admin'));

        return self::SUCCESS;
    }
}
