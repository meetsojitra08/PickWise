<?php

declare(strict_types=1);

namespace App\Enums;

enum ProductSort: string
{
    case Relevance = 'relevance';
    case PriceAsc = 'price_asc';
    case PriceDesc = 'price_desc';
    case Rating = 'rating';
    case Value = 'value';
    case Newest = 'newest';

    /**
     * Return all backed string values for validation and query parsing.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $sort): string => $sort->value,
            self::cases(),
        );
    }
}
