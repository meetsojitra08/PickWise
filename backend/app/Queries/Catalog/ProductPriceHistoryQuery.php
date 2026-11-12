<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Models\Product;

/** Loads a publicly visible product with its complete, chronological price history. */
final class ProductPriceHistoryQuery
{
    public function __construct(
        private readonly ProductDetailQuery $productDetail,
    ) {}

    public function forSlug(string $slug): Product
    {
        $product = $this->productDetail->forSlug($slug);
        $product->load('priceHistory');

        return $product;
    }
}
