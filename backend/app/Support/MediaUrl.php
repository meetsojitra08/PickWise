<?php

declare(strict_types=1);

namespace App\Support;

final class MediaUrl
{
    /**
     * Convert a stored public-disk relative path into a browser-safe same-origin URL.
     */
    public static function fromPublicPath(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $trimmed = trim($path);

        if ($trimmed === '') {
            return null;
        }

        if (
            str_starts_with($trimmed, 'http://')
            || str_starts_with($trimmed, 'https://')
            || str_starts_with($trimmed, '/')
        ) {
            return $trimmed;
        }

        return '/storage/'.ltrim($trimmed, '/');
    }
}
