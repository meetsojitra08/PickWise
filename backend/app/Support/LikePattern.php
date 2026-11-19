<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Escapes SQL LIKE wildcards so user-supplied search input is matched literally.
 */
final class LikePattern
{
    public const string ESCAPE_CHAR = '!';

    /**
     * Escape LIKE special characters (!, %, _) using "!" as the escape character.
     */
    public static function escape(string $value): string
    {
        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value);
    }

    /**
     * Build a lowercased substring LIKE pattern ("%escaped%") for use with ESCAPE '!'.
     */
    public static function containsLower(string $value): string
    {
        return '%'.self::escape(mb_strtolower(trim($value))).'%';
    }
}
