<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\SpecDataType;
use App\Models\Category;
use App\Models\SpecDefinition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreSpecDefinitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', SpecDefinition::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('key') && is_string($this->input('key'))) {
            $merge['key'] = Str::snake(trim($this->input('key')));
        }

        if ($this->input('data_type') !== SpecDataType::Number->value && $this->has('higher_is_better')) {
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

        return [
            'key' => [
                'required',
                'string',
                'min:2',
                'max:80',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('spec_definitions', 'key')->where('category_id', $categoryId),
            ],
            'label' => ['required', 'string', 'min:2', 'max:120'],
            'unit' => ['nullable', 'string', 'max:30'],
            'data_type' => ['required', Rule::enum(SpecDataType::class)],
            'is_filterable' => ['nullable', 'boolean'],
            'is_comparable' => ['nullable', 'boolean'],
            'higher_is_better' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }
}
