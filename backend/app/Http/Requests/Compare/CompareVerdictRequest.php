<?php

declare(strict_types=1);

namespace App\Http\Requests\Compare;

use App\Http\Requests\Concerns\ValidatesComparableProducts;
use App\Models\Comparison;
use App\Queries\Catalog\ActiveCategoryScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CompareVerdictRequest extends FormRequest
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
            'priority' => ['sometimes', 'nullable', 'string', 'max:100'],
            'comparison_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('comparisons', 'id'),
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

                $comparisonId = $this->input('comparison_id');
                if ($comparisonId !== null && is_numeric($comparisonId)) {
                    $user = $this->user();
                    $comparison = Comparison::query()->find((int) $comparisonId);

                    if ($comparison instanceof Comparison && ($user === null || $comparison->user_id !== $user->getKey())) {
                        $validator->errors()->add('comparison_id', 'You cannot attach a verdict to another user\'s comparison.');
                    }
                }
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
            'priority.max' => 'Priority description must be 100 characters or fewer.',
            'comparison_id.exists' => 'The selected comparison does not exist.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->priority)) {
            $trimmed = trim($this->priority);
            $this->merge(['priority' => $trimmed === '' ? null : $trimmed]);
        }
    }

    public function priority(): ?string
    {
        $priority = $this->validated('priority');

        return is_string($priority) && trim($priority) !== '' ? trim($priority) : null;
    }

    public function comparisonId(): ?int
    {
        $comparisonId = $this->validated('comparison_id');

        return is_numeric($comparisonId) ? (int) $comparisonId : null;
    }
}
