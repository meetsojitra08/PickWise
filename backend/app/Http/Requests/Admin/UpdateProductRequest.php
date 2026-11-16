<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\ProductAvailability;
use App\Enums\SpecDataType;
use App\Models\Product;
use App\Models\SpecDefinition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = $this->route('product');

        return $product instanceof Product
            ? ($this->user()?->can('update', $product) ?? false)
            : false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('slug') && is_string($this->input('slug')) && filled($this->input('slug'))) {
            $this->merge([
                'slug' => Str::slug($this->input('slug')),
            ]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $product = $this->route('product');
        $productId = $product instanceof Product ? $product->id : null;

        return [
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'brand_id' => ['sometimes', 'required', 'integer', 'exists:brands,id'],
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:200'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('products', 'slug')->ignore($productId),
            ],
            'summary' => ['sometimes', 'required', 'string', 'min:2', 'max:300'],
            'description' => ['sometimes', 'required', 'string', 'min:2'],
            'price' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'availability' => ['sometimes', 'required', Rule::enum(ProductAvailability::class)],
            'store_url' => ['nullable', 'url', 'max:2048'],
            'is_published' => ['sometimes', 'required', 'boolean'],
            'specs' => ['nullable', 'array'],
            'specs.*.spec_definition_id' => [
                'required_with:specs',
                'integer',
                'distinct',
                'exists:spec_definitions,id',
            ],
            'specs.*.value' => ['required_with:specs'],
        ];
    }

    /**
     * Additional validation for category consistency and typed spec values.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $product = $this->route('product');
                if (! $product instanceof Product) {
                    return;
                }

                $categoryId = (int) $this->input('category_id', $product->category_id);
                $rawSpecs = $this->input('specs');

                if (! is_array($rawSpecs) || $rawSpecs === [] || $categoryId <= 0) {
                    return;
                }

                $definitionIds = [];
                foreach ($rawSpecs as $specItem) {
                    if (is_array($specItem) && isset($specItem['spec_definition_id']) && is_numeric($specItem['spec_definition_id'])) {
                        $definitionIds[] = (int) $specItem['spec_definition_id'];
                    }
                }

                $definitions = SpecDefinition::query()
                    ->whereIn('id', $definitionIds)
                    ->get()
                    ->keyBy('id');

                foreach ($rawSpecs as $index => $specItem) {
                    if (! is_array($specItem) || ! isset($specItem['spec_definition_id'])) {
                        continue;
                    }

                    $defId = (int) $specItem['spec_definition_id'];
                    $definition = $definitions->get($defId);

                    if (! $definition instanceof SpecDefinition) {
                        continue;
                    }

                    if ($definition->category_id !== $categoryId) {
                        $validator->errors()->add(
                            "specs.{$index}.spec_definition_id",
                            "The spec '{$definition->label}' does not belong to the selected category.",
                        );

                        continue;
                    }

                    $value = $specItem['value'] ?? null;
                    $this->validateSpecValue($validator, $definition, $value, (int) $index);
                }
            },
        ];
    }

    private function validateSpecValue(
        Validator $validator,
        SpecDefinition $definition,
        mixed $value,
        int $index,
    ): void {
        match ($definition->data_type) {
            SpecDataType::Number => is_numeric($value)
                ? null
                : $validator->errors()->add(
                    "specs.{$index}.value",
                    "The {$definition->label} spec must be a valid number.",
                ),
            SpecDataType::Boolean => is_bool($value) || in_array($value, [0, 1, '0', '1', 'true', 'false', true, false], true)
                ? null
                : $validator->errors()->add(
                    "specs.{$index}.value",
                    "The {$definition->label} spec must be a boolean value.",
                ),
            SpecDataType::Text => is_string($value) || is_numeric($value)
                ? null
                : $validator->errors()->add(
                    "specs.{$index}.value",
                    "The {$definition->label} spec must be text.",
                ),
        };
    }
}
