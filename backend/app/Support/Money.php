<?php

declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

final class Money
{
    public const DEFAULT_CURRENCY = 'INR';

    /**
     * Format a decimal price into the canonical API money object without float arithmetic.
     *
     * @return array{amount: string, currency: string}
     */
    public static function toArray(string|int|float $amount, string $currency = self::DEFAULT_CURRENCY): array
    {
        return [
            'amount' => self::normalizeAmount($amount),
            'currency' => strtoupper(trim($currency)) !== '' ? strtoupper(trim($currency)) : self::DEFAULT_CURRENCY,
        ];
    }

    /**
     * Normalize a numeric money string or scalar to exactly two decimal places.
     */
    public static function normalizeAmount(string|int|float $amount): string
    {
        $raw = trim((string) $amount);

        if ($raw === '' || ! is_numeric($raw)) {
            throw new InvalidArgumentException("Invalid money amount [{$raw}].");
        }

        if (function_exists('bcadd')) {
            return bcadd($raw, '0', 2);
        }

        $sign = str_starts_with($raw, '-') ? '-' : '';
        $unsigned = ltrim($raw, '+-');
        [$integerPart, $fractionPart] = array_pad(explode('.', $unsigned, 2), 2, '');

        $normalizedInteger = ltrim($integerPart, '0');
        $normalizedInteger = $normalizedInteger === '' ? '0' : $normalizedInteger;
        $normalizedFraction = str_pad(substr($fractionPart, 0, 2), 2, '0');

        return $sign.$normalizedInteger.'.'.$normalizedFraction;
    }

    /**
     * Compare two decimal money values without floating-point arithmetic.
     */
    public static function compare(string|int|float $left, string|int|float $right): int
    {
        $normalizedLeft = self::normalizeAmount($left);
        $normalizedRight = self::normalizeAmount($right);

        if (function_exists('bccomp')) {
            return bccomp($normalizedLeft, $normalizedRight, 2);
        }

        return self::toMinorUnits($normalizedLeft) <=> self::toMinorUnits($normalizedRight);
    }

    private static function toMinorUnits(string $normalizedAmount): int
    {
        $isNegative = str_starts_with($normalizedAmount, '-');
        $unsigned = ltrim($normalizedAmount, '-');
        [$whole, $fraction] = explode('.', $unsigned, 2);
        $units = ((int) $whole * 100) + (int) $fraction;

        return $isNegative ? -$units : $units;
    }
}
