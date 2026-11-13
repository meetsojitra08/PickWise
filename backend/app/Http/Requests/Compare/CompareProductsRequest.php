<?php

declare(strict_types=1);

namespace App\Http\Requests\Compare;

use App\Models\Product;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CompareProductsRequest extends FormRequest
{
    public const int MIN_PRODUCTS = 2;

    public const int MAX_PRODUCTS = 4;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:'.self::MIN_PRODUCTS, 'max:'.self::MAX_PRODUCTS],
            'product_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('products', 'id')
                    ->where('is_published', true)
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /**
     * Keep comparison visibility aligned with the catalog: products must live in
     * reachable active categories and all share one category.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(ActiveCategoryScope $categoryScope): array
    {
        return [
            function (Validator $validator) use ($categoryScope): void {
                $this->validateComparableProducts($validator, $categoryScope);
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_ids.required' => 'Choose two to four products to compare.',
            'product_ids.array' => 'Choose two to four products to compare.',
            'product_ids.min' => 'Choose at least two products to compare.',
            'product_ids.max' => 'You can compare up to four products at a time.',
            'product_ids.*.required' => 'Choose two to four products to compare.',
            'product_ids.*.integer' => 'Each product id must be a whole number.',
            'product_ids.*.distinct' => 'Each product can only appear once.',
            'product_ids.*.exists' => 'This product is not available to compare.',
        ];
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

    private function validateComparableProducts(Validator $validator, ActiveCategoryScope $categoryScope): void
    {
        if ($validator->errors()->isNotEmpty()) {
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
}
