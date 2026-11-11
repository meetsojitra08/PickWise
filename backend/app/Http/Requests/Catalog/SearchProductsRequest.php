<?php

declare(strict_types=1);

namespace App\Http\Requests\Catalog;

use App\Data\Catalog\ProductSearchCriteria;
use App\Data\Catalog\ProductSpecFilter;
use App\Enums\ProductAvailability;
use App\Enums\ProductSort;
use App\Enums\SpecDataType;
use App\Models\SpecDefinition;
use App\Queries\Catalog\ActiveCategoryScope;
use App\Support\Money;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SearchProductsRequest extends FormRequest
{
    /**
     * @var list<ProductSpecFilter>
     */
    private array $resolvedSpecFilters = [];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        $query = $this->input('q');
        if (is_string($query)) {
            $trimmed = trim($query);
            $updates['q'] = $trimmed !== '' ? $trimmed : null;
        }

        $category = $this->input('category');
        if (is_string($category)) {
            $normalized = Str::lower(trim($category));
            $updates['category'] = $normalized !== '' ? $normalized : null;
        }

        $brand = $this->input('brand');
        if (is_array($brand)) {
            $updates['brand'] = array_map(
                static fn (mixed $item): mixed => is_string($item) ? Str::lower(trim($item)) : $item,
                $brand,
            );
        }

        foreach (['price_min', 'price_max', 'rating_min'] as $numericField) {
            $value = $this->input($numericField);
            if (is_string($value)) {
                $trimmed = trim($value);
                $updates[$numericField] = $trimmed !== '' ? $trimmed : null;
            }
        }

        foreach (['availability', 'sort'] as $enumField) {
            $value = $this->input($enumField);
            if (is_string($value)) {
                $normalized = Str::lower(trim($value));
                $updates[$enumField] = $normalized !== '' ? $normalized : null;
            }
        }

        $spec = $this->input('spec');
        if (is_array($spec)) {
            $updates['spec'] = $this->normalizeSpecInput($spec);
        }

        if ($updates !== []) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:200'],
            'category' => ['nullable', 'string', 'max:120'],
            'brand' => ['nullable', 'array', 'max:30'],
            'brand.*' => ['required', 'string', 'max:120'],
            'price_min' => ['nullable', 'numeric', 'min:0', 'max:100000000', 'regex:/^-?\d+(?:\.\d{1,2})?$/'],
            'price_max' => ['nullable', 'numeric', 'min:0', 'max:100000000', 'regex:/^-?\d+(?:\.\d{1,2})?$/'],
            'rating_min' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'availability' => ['nullable', 'string', Rule::enum(ProductAvailability::class)],
            'spec' => ['nullable', 'array', 'max:20'],
            'sort' => ['nullable', 'string', Rule::enum(ProductSort::class)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.ProductSearchCriteria::MAX_PER_PAGE],
        ];
    }

    /**
     * Validate cross-field price bounds and typed dynamic spec filters against active spec definitions.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(ActiveCategoryScope $categoryScope): array
    {
        return [
            function (Validator $validator) use ($categoryScope): void {
                $this->validatePriceBounds($validator);
                $this->validateAndResolveSpecFilters($validator, $categoryScope);
            },
        ];
    }

    /**
     * Convert validated query parameters into a typed search criteria DTO.
     */
    public function toCriteria(): ProductSearchCriteria
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        $brandSlugs = [];
        if (isset($validated['brand']) && is_array($validated['brand'])) {
            foreach ($validated['brand'] as $slug) {
                if (is_string($slug) && $slug !== '') {
                    $brandSlugs[] = $slug;
                }
            }
            $brandSlugs = array_values(array_unique($brandSlugs));
        }

        $priceMin = $this->normalizeMoneyInput($validated['price_min'] ?? null);
        $priceMax = $this->normalizeMoneyInput($validated['price_max'] ?? null);
        $ratingMin = isset($validated['rating_min']) && is_numeric($validated['rating_min'])
            ? (float) $validated['rating_min']
            : null;

        $availability = isset($validated['availability']) && is_string($validated['availability'])
            ? ProductAvailability::tryFrom($validated['availability'])
            : null;

        $sort = isset($validated['sort']) && is_string($validated['sort'])
            ? ProductSort::tryFrom($validated['sort'])
            : null;

        $page = isset($validated['page']) && is_numeric($validated['page'])
            ? (int) $validated['page']
            : 1;

        $perPage = isset($validated['per_page']) && is_numeric($validated['per_page'])
            ? (int) $validated['per_page']
            : ProductSearchCriteria::DEFAULT_PER_PAGE;

        return new ProductSearchCriteria(
            query: isset($validated['q']) && is_string($validated['q']) ? $validated['q'] : null,
            categorySlug: isset($validated['category']) && is_string($validated['category']) ? $validated['category'] : null,
            brandSlugs: $brandSlugs,
            priceMin: $priceMin,
            priceMax: $priceMax,
            ratingMin: $ratingMin,
            availability: $availability,
            specFilters: $this->resolvedSpecFilters,
            sort: $sort,
            page: $page,
            perPage: $perPage,
        );
    }

    /**
     * Strip empty spec entries so blank form inputs (e.g. `?spec[ram_gb]=`) do not fail validation.
     *
     * @param  array<mixed, mixed>  $specInput
     * @return array<string, mixed>|null
     */
    private function normalizeSpecInput(array $specInput): ?array
    {
        $cleaned = [];

        foreach ($specInput as $rawKey => $rawValue) {
            if (! is_string($rawKey)) {
                continue;
            }

            $key = trim($rawKey);
            if ($key === '') {
                continue;
            }

            if ($rawValue === null) {
                continue;
            }

            if (is_string($rawValue)) {
                $trimmed = trim($rawValue);
                if ($trimmed === '') {
                    continue;
                }
                $cleaned[$key] = $trimmed;

                continue;
            }

            if (is_array($rawValue)) {
                $items = [];
                foreach ($rawValue as $item) {
                    if ($item === null) {
                        continue;
                    }
                    if (is_string($item)) {
                        $trimmedItem = trim($item);
                        if ($trimmedItem === '') {
                            continue;
                        }
                        $items[] = $trimmedItem;

                        continue;
                    }
                    $items[] = $item;
                }

                if ($items !== []) {
                    $cleaned[$key] = $items;
                }

                continue;
            }

            $cleaned[$key] = $rawValue;
        }

        return $cleaned !== [] ? $cleaned : null;
    }

    private function validatePriceBounds(Validator $validator): void
    {
        if ($validator->errors()->has('price_min') || $validator->errors()->has('price_max')) {
            return;
        }

        $priceMin = $this->normalizeMoneyInput($this->input('price_min'));
        $priceMax = $this->normalizeMoneyInput($this->input('price_max'));

        if ($priceMin !== null && $priceMax !== null && Money::compare($priceMin, $priceMax) > 0) {
            $validator->errors()->add(
                'price_max',
                'The maximum price must be greater than or equal to the minimum price.',
            );
        }
    }

    private function validateAndResolveSpecFilters(Validator $validator, ActiveCategoryScope $categoryScope): void
    {
        $this->resolvedSpecFilters = [];

        if ($validator->errors()->has('spec')) {
            return;
        }

        $specInput = $this->input('spec');
        if (! is_array($specInput) || $specInput === []) {
            return;
        }

        $requestedKeys = array_values(array_filter(
            array_keys($specInput),
            static fn (mixed $key): bool => is_string($key) && $key !== '' && strlen($key) <= 100,
        ));

        if ($requestedKeys === []) {
            return;
        }

        $categorySlug = $this->input('category');
        $categoryIds = is_string($categorySlug) && $categorySlug !== '' && ! $validator->errors()->has('category')
            ? $categoryScope->descendantIdsForSlug($categorySlug)
            : $categoryScope->reachableIds();

        if ($categoryIds === []) {
            return;
        }

        /** @var Collection<int, SpecDefinition> $definitions */
        $definitions = SpecDefinition::query()
            ->whereIn('category_id', $categoryIds)
            ->where('is_filterable', true)
            ->whereIn('key', $requestedKeys)
            ->get(['id', 'key', 'data_type']);

        /** @var array<string, list<SpecDefinition>> $definitionsByKey */
        $definitionsByKey = [];
        foreach ($definitions as $definition) {
            $definitionsByKey[$definition->key][] = $definition;
        }

        foreach ($specInput as $key => $rawValue) {
            if (! is_string($key) || ! isset($definitionsByKey[$key])) {
                // Unknown or non-filterable spec keys are safely ignored per catalog filter spec.
                continue;
            }

            $matchingDefs = $definitionsByKey[$key];
            $primaryType = $matchingDefs[0]->data_type;
            $specDefinitionIds = [];

            foreach ($matchingDefs as $definition) {
                if ($definition->data_type === $primaryType) {
                    $specDefinitionIds[] = $definition->id;
                }
            }

            $parsed = match ($primaryType) {
                SpecDataType::Number => $this->parseNumericSpec($validator, $key, $rawValue, $specDefinitionIds),
                SpecDataType::Boolean => $this->parseBooleanSpec($validator, $key, $rawValue, $specDefinitionIds),
                SpecDataType::Text => $this->parseTextSpec($validator, $key, $rawValue, $specDefinitionIds),
            };

            if ($parsed instanceof ProductSpecFilter) {
                $this->resolvedSpecFilters[] = $parsed;
            }
        }
    }

    /**
     * @param  list<int>  $specDefinitionIds
     */
    private function parseNumericSpec(
        Validator $validator,
        string $key,
        mixed $rawValue,
        array $specDefinitionIds,
    ): ?ProductSpecFilter {
        if (! is_string($rawValue) && ! is_int($rawValue) && ! is_float($rawValue)) {
            $validator->errors()->add("spec.{$key}", "The {$key} spec filter must be a number or min:max range.");

            return null;
        }

        $value = trim((string) $rawValue);
        $colonCount = substr_count($value, ':');

        if ($colonCount > 1) {
            $validator->errors()->add("spec.{$key}", "The {$key} spec range format is invalid.");

            return null;
        }

        if ($colonCount === 0) {
            if (! $this->isValidFiniteNumber($value)) {
                $validator->errors()->add("spec.{$key}", "The {$key} spec filter must be a valid number.");

                return null;
            }

            return new ProductSpecFilter(
                key: $key,
                dataType: SpecDataType::Number,
                specDefinitionIds: $specDefinitionIds,
                exactNumber: (float) $value,
            );
        }

        [$rawMin, $rawMax] = array_map('trim', explode(':', $value, 2));

        if ($rawMin === '' && $rawMax === '') {
            $validator->errors()->add("spec.{$key}", "The {$key} spec range must specify at least a minimum or maximum.");

            return null;
        }

        if ($rawMin !== '' && ! $this->isValidFiniteNumber($rawMin)) {
            $validator->errors()->add("spec.{$key}", "The {$key} minimum value must be a valid number.");

            return null;
        }

        if ($rawMax !== '' && ! $this->isValidFiniteNumber($rawMax)) {
            $validator->errors()->add("spec.{$key}", "The {$key} maximum value must be a valid number.");

            return null;
        }

        $min = $rawMin !== '' ? (float) $rawMin : null;
        $max = $rawMax !== '' ? (float) $rawMax : null;

        if ($min !== null && $max !== null && $min > $max) {
            $validator->errors()->add("spec.{$key}", "The {$key} minimum value must not exceed the maximum value.");

            return null;
        }

        return new ProductSpecFilter(
            key: $key,
            dataType: SpecDataType::Number,
            specDefinitionIds: $specDefinitionIds,
            min: $min,
            max: $max,
        );
    }

    /**
     * @param  list<int>  $specDefinitionIds
     */
    private function parseBooleanSpec(
        Validator $validator,
        string $key,
        mixed $rawValue,
        array $specDefinitionIds,
    ): ?ProductSpecFilter {
        $boolValue = null;

        if (is_bool($rawValue)) {
            $boolValue = $rawValue;
        } elseif (is_int($rawValue) && ($rawValue === 0 || $rawValue === 1)) {
            $boolValue = $rawValue === 1;
        } elseif (is_string($rawValue)) {
            $normalized = Str::lower(trim($rawValue));
            $boolValue = match ($normalized) {
                '1', 'true', 'yes' => true,
                '0', 'false', 'no' => false,
                default => null,
            };
        }

        if ($boolValue === null) {
            $validator->errors()->add("spec.{$key}", "The {$key} spec filter must be true or false.");

            return null;
        }

        return new ProductSpecFilter(
            key: $key,
            dataType: SpecDataType::Boolean,
            specDefinitionIds: $specDefinitionIds,
            boolValue: $boolValue,
        );
    }

    /**
     * @param  list<int>  $specDefinitionIds
     */
    private function parseTextSpec(
        Validator $validator,
        string $key,
        mixed $rawValue,
        array $specDefinitionIds,
    ): ?ProductSpecFilter {
        $items = is_array($rawValue) ? $rawValue : [$rawValue];

        if ($items === [] || count($items) > 20) {
            $validator->errors()->add("spec.{$key}", "The {$key} spec filter must contain between 1 and 20 values.");

            return null;
        }

        $textValues = [];

        foreach ($items as $item) {
            if (! is_string($item)) {
                $validator->errors()->add("spec.{$key}", "The {$key} spec filter values must be strings.");

                return null;
            }

            $trimmed = trim($item);
            if ($trimmed === '' || mb_strlen($trimmed) > 120) {
                $validator->errors()->add("spec.{$key}", "The {$key} spec filter values must be between 1 and 120 characters.");

                return null;
            }

            $textValues[] = $trimmed;
        }

        return new ProductSpecFilter(
            key: $key,
            dataType: SpecDataType::Text,
            specDefinitionIds: $specDefinitionIds,
            textValues: array_values(array_unique($textValues)),
        );
    }

    private function isValidFiniteNumber(string $value): bool
    {
        return preg_match('/^-?\d+(?:\.\d+)?$/', $value) === 1;
    }

    private function normalizeMoneyInput(mixed $value): ?string
    {
        if (! is_string($value) && ! is_int($value) && ! is_float($value)) {
            return null;
        }

        $raw = trim((string) $value);
        if ($raw === '' || preg_match('/^-?\d+(?:\.\d{1,2})?$/', $raw) !== 1) {
            return null;
        }

        return Money::normalizeAmount($raw);
    }
}
