<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\SpecDataType;
use App\Models\Category;
use App\Models\SpecDefinition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateSpecDefinitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $spec = $this->route('spec');
        if (! $spec instanceof SpecDefinition) {
            $spec = $this->route('specDefinition');
        }

        return $spec instanceof SpecDefinition && ($this->user()?->can('update', $spec) ?? false);
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('key') && is_string($this->input('key'))) {
            $merge['key'] = Str::snake(trim($this->input('key')));
        }

        $effectiveDataType = $this->input('data_type');
        if ($effectiveDataType === null) {
            $spec = $this->route('spec') ?? $this->route('specDefinition');
            if ($spec instanceof SpecDefinition) {
                $effectiveDataType = $spec->data_type->value;
            }
        }

        if ($effectiveDataType !== SpecDataType::Number->value && $this->has('higher_is_better')) {
            $merge['higher_is_better'] = null;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $category = $this->route('category');
        $categoryId = $category instanceof Category ? $category->id : null;

        $spec = $this->route('spec');
        if (! $spec instanceof SpecDefinition) {
            $spec = $this->route('specDefinition');
        }
        $specId = $spec instanceof SpecDefinition ? $spec->id : null;

        return [
            'key' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:80',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('spec_definitions', 'key')
                    ->where('category_id', $categoryId)
                    ->ignore($specId),
            ],
            'label' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'unit' => ['nullable', 'string', 'max:30'],
            'data_type' => ['sometimes', 'required', Rule::enum(SpecDataType::class)],
            'is_filterable' => ['sometimes', 'boolean'],
            'is_comparable' => ['sometimes', 'boolean'],
            'higher_is_better' => ['nullable', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ];
    }
}
