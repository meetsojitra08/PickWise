<?php

declare(strict_types=1);

namespace App\Http\Requests\Comparison;

use App\Http\Requests\Concerns\ValidatesComparableProducts;
use App\Models\Comparison;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreComparisonRequest extends FormRequest
{
    use ValidatesComparableProducts;

    public const int MIN_PRODUCTS = 2;

    public const int MAX_PRODUCTS = 4;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Comparison::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:100'],
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
            'name.required' => 'Give this comparison a name.',
            'name.min' => 'Comparison names must be at least 1 character.',
            'name.max' => 'Comparison names must be 100 characters or fewer.',
            ...$this->comparableMessages(),
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->name)) {
            $this->merge(['name' => trim($this->name)]);
        }
    }
}
