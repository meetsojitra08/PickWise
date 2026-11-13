<?php

declare(strict_types=1);

namespace App\Http\Requests\Compare;

use App\Http\Requests\Concerns\ValidatesComparableProducts;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CompareProductsRequest extends FormRequest
{
    use ValidatesComparableProducts;

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
}
