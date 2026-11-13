<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Models\Product;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Validation\Validator;

/**
 * Shared validation for requests that compare or save a set of products.
 */
trait ValidatesComparableProducts
{
    /**
     * Keep comparison visibility aligned with the catalog: products must live in
     * reachable active categories and all share one category.
     */
    protected function validateComparableProducts(Validator $validator, ActiveCategoryScope $categoryScope): void
    {
        if ($validator->errors()->isNotEmpty() || ! $this->has('product_ids')) {
            return;
        }

        $productIds = $this->productIds();
        $reachableCategoryIds = $categoryScope->reachableIds();

        $products = Product::query()
            ->whereKey($productIds)
            ->get(['id', 'category_id']);

        $hasUnreachableProduct = $products->contains(
            static fn (Product $product): bool => ! in_array($product->category_id, $reachableCategoryIds, true),
        );

        if ($hasUnreachableProduct) {
            $validator->errors()->add('product_ids', 'One or more products are not available to compare.');

            return;
        }

        if ($products->pluck('category_id')->unique()->count() > 1) {
            $validator->errors()->add('product_ids', 'Products from different categories cannot be compared.');
        }
    }

    /**
     * Return the validated product ids in the order the shopper picked them.
     *
     * @return list<int>
     */
    public function productIds(): array
    {
        $productIds = $this->validated('product_ids');

        if (! is_array($productIds)) {
            return [];
        }

        return array_values(array_map(
            static fn (mixed $productId): int => (int) $productId,
            $productIds,
        ));
    }

    /**
     * @return array<string, string>
     */
    protected function comparableMessages(): array
    {
        return [
            'product_ids.required' => 'Choose two to four products to save.',
            'product_ids.array' => 'Choose two to four products to save.',
            'product_ids.min' => 'Choose at least two products to save.',
            'product_ids.max' => 'You can save up to four products in one comparison.',
            'product_ids.*.required' => 'Choose two to four products to save.',
            'product_ids.*.integer' => 'Each product id must be a whole number.',
            'product_ids.*.distinct' => 'Each product can only appear once.',
            'product_ids.*.exists' => 'This product is not available to compare.',
        ];
    }
}
