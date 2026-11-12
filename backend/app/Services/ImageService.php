<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class ImageService
{
    /** Square-crop and resize an avatar to keep data usage low. Returns the stored path on the public disk. */
    public function storeAvatar(UploadedFile $file, int $size = 256): string
    {
        $image = (new ImageManager(Driver::class))->decodePath($file->getRealPath())->cover($size, $size);
        $path = 'avatars/'.Str::uuid().'.webp';
        Storage::disk('public')->put($path, (string) $image->encode(new WebpEncoder(quality: 80)));

        return $path;
    }

    /** Student card photos stay private (local disk), resized to a readable max width. */
    public function storeCardPhoto(UploadedFile $file): string
    {
        $image = (new ImageManager(Driver::class))->decodePath($file->getRealPath())->scaleDown(width: 1400);
        $path = 'cards/'.Str::uuid().'.webp';
        Storage::disk('local')->put($path, (string) $image->encode(new WebpEncoder(quality: 85)));

        return $path;
    }
}
