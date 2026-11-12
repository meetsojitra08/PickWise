<?php

declare(strict_types=1);

namespace Database\Seeders\Catalog;

use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Shared deterministic categories, brands, and price-curve helpers for showcase seeding.
 */
final class CatalogDefinitions
{
    /**
     * Biweekly checkpoint offsets covering the trailing six months (180 days).
     *
     * @var list<int>
     */
    private const PRICE_CHECKPOINT_DAYS_AGO = [
        180, 165, 150, 135, 120, 105, 90, 75, 60, 45, 30, 15, 0,
    ];

    /**
     * Named percentage-of-current price profiles for realistic deterministic charts.
     *
     * @var array<string, list<int>>
     */
    private const PRICE_PROFILES = [
        'recent_drop' => [112, 112, 110, 110, 108, 108, 106, 106, 105, 104, 102, 100, 100],
        'festival_dip' => [108, 108, 105, 104, 96, 94, 98, 103, 103, 101, 99, 100, 100],
        'gradual_drop' => [115, 114, 112, 111, 109, 108, 106, 105, 104, 102, 101, 100, 100],
        'steady' => [102, 102, 100, 100, 100, 99, 99, 100, 101, 100, 100, 100, 100],
        'launch_premium' => [118, 118, 115, 115, 110, 110, 107, 105, 105, 103, 102, 100, 100],
        'rebound' => [104, 102, 98, 95, 93, 95, 97, 99, 101, 101, 100, 100, 100],
    ];

    /**
     * Return the six root showcase categories aligned with frontend starter category slugs.
     *
     * @return list<array{slug: string, name: string, description: string, sort_order: int}>
     */
    public static function categories(): array
    {
        return [
            [
                'slug' => 'smartphones',
                'name' => 'Smartphones',
                'description' => 'Compare 5G handsets across camera performance, battery endurance, display smoothness, and everyday value.',
                'sort_order' => 1,
            ],
            [
                'slug' => 'laptops',
                'name' => 'Laptops',
                'description' => 'Ultrabooks, creator workstations, and gaming notebooks filtered by memory, storage, portability, and GPU capability.',
                'sort_order' => 2,
            ],
            [
                'slug' => 'headphones',
                'name' => 'Headphones',
                'description' => 'Noise-cancelling travel headphones, workout earbuds, wireless gaming headsets, and studio reference cans.',
                'sort_order' => 3,
            ],
            [
                'slug' => 'monitors',
                'name' => 'Monitors',
                'description' => 'Color-accurate 4K creator displays, fast 1440p gaming panels, and single-cable USB-C productivity monitors.',
                'sort_order' => 4,
            ],
            [
                'slug' => 'keyboards',
                'name' => 'Keyboards',
                'description' => 'Hot-swappable mechanical boards, low-profile wireless travel keyboards, and quiet desk setups.',
                'sort_order' => 5,
            ],
            [
                'slug' => 'smartwatches',
                'name' => 'Smartwatches',
                'description' => 'Multi-day AMOLED fitness watches, dual-frequency GPS running trackers, and everyday LTE wearables.',
                'sort_order' => 6,
            ],
        ];
    }

    /**
     * Return the canonical showcase brand catalogue.
     *
     * @return list<array{slug: string, name: string}>
     */
    public static function brands(): array
    {
        return [
            ['slug' => 'amazfit', 'name' => 'Amazfit'],
            ['slug' => 'apple', 'name' => 'Apple'],
            ['slug' => 'asus', 'name' => 'ASUS'],
            ['slug' => 'benq', 'name' => 'BenQ'],
            ['slug' => 'bose', 'name' => 'Bose'],
            ['slug' => 'dell', 'name' => 'Dell'],
            ['slug' => 'garmin', 'name' => 'Garmin'],
            ['slug' => 'google', 'name' => 'Google'],
            ['slug' => 'hp', 'name' => 'HP'],
            ['slug' => 'keychron', 'name' => 'Keychron'],
            ['slug' => 'lenovo', 'name' => 'Lenovo'],
            ['slug' => 'lg', 'name' => 'LG'],
            ['slug' => 'logitech', 'name' => 'Logitech'],
            ['slug' => 'nothing', 'name' => 'Nothing'],
            ['slug' => 'nuphy', 'name' => 'NuPhy'],
            ['slug' => 'oneplus', 'name' => 'OnePlus'],
            ['slug' => 'royal-kludge', 'name' => 'Royal Kludge'],
            ['slug' => 'samsung', 'name' => 'Samsung'],
            ['slug' => 'sennheiser', 'name' => 'Sennheiser'],
            ['slug' => 'sony', 'name' => 'Sony'],
            ['slug' => 'xiaomi', 'name' => 'Xiaomi'],
        ];
    }

    /**
     * Build a deterministic 6-month price history sequence ending on the product's current price.
     *
     * @return list<array{price: string, recorded_at: string}>
     */
    public static function priceHistoryFor(
        int $currentRupees,
        string $profile,
        CarbonImmutable $anchorDate,
    ): array {
        $percentages = self::PRICE_PROFILES[$profile] ?? throw new InvalidArgumentException(
            "Unknown price profile [{$profile}].",
        );

        $series = [];

        foreach (self::PRICE_CHECKPOINT_DAYS_AGO as $index => $daysAgo) {
            $recordedAt = $anchorDate->subDays($daysAgo)->toDateString();

            if ($daysAgo === 0) {
                $series[] = [
                    'price' => sprintf('%d.00', $currentRupees),
                    'recorded_at' => $recordedAt,
                ];

                continue;
            }

            $percent = $percentages[$index];
            $historicalRupees = self::roundHistoricalRupees(
                rawRupees: intdiv($currentRupees * $percent, 100),
                currentRupees: $currentRupees,
            );

            $series[] = [
                'price' => sprintf('%d.00', $historicalRupees),
                'recorded_at' => $recordedAt,
            ];
        }

        return $series;
    }

    private static function roundHistoricalRupees(int $rawRupees, int $currentRupees): int
    {
        $step = $currentRupees >= 20000 ? 500 : ($currentRupees >= 5000 ? 100 : 50);
        $rounded = intdiv($rawRupees + intdiv($step, 2), $step) * $step;

        if ($currentRupees % 100 === 99 && $rounded > 100) {
            $rounded -= 1;
        } elseif ($currentRupees % 100 === 90 && $rounded > 100) {
            $rounded -= 10;
        }

        return max(100, $rounded);
    }
}
