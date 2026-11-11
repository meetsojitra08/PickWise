<?php

declare(strict_types=1);

use App\Data\Catalog\ProductSearchCriteria;
use App\Enums\ProductSort;

test('product sort enum defines expected cases and values', function (): void {
    expect(ProductSort::values())->toBe([
        'relevance',
        'price_asc',
        'price_desc',
        'rating',
        'value',
        'newest',
    ])
        ->and(ProductSort::from('price_asc'))->toBe(ProductSort::PriceAsc)
        ->and(ProductSort::tryFrom('popularity'))->toBeNull();
});

test('product search criteria resolves default sort from presence of query', function (): void {
    $browsing = new ProductSearchCriteria;
    $searching = new ProductSearchCriteria(query: 'laptop');
    $explicitOverride = new ProductSearchCriteria(query: 'laptop', sort: ProductSort::PriceAsc);

    expect($browsing->resolvedSort())->toBe(ProductSort::Value)
        ->and($searching->resolvedSort())->toBe(ProductSort::Relevance)
        ->and($explicitOverride->resolvedSort())->toBe(ProductSort::PriceAsc)
        ->and($browsing->perPage)->toBe(24)
        ->and(ProductSearchCriteria::MAX_PER_PAGE)->toBe(48);
});
