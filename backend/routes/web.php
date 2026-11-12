<?php

use App\Models\CardVerification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::redirect('/', '/admin');

// Private student card photos, only for admins (used by the Filament panel).
Route::get('/admin/card-photos/{cardVerification}', function (CardVerification $cardVerification) {
    abort_unless(auth()->user()?->is_admin, 403);
    abort_unless(Storage::disk('local')->exists($cardVerification->photo_path), 404);

    return response()->file(Storage::disk('local')->path($cardVerification->photo_path));
})->middleware(['web', 'auth'])->name('admin.card-photo');
