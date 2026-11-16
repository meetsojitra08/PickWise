<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Brand;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        $brand = $this->route('brand');

        return $brand instanceof Brand
            ? ($this->user()?->can('update', $brand) ?? false)
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
        $brand = $this->route('brand');
        $brandId = $brand instanceof Brand ? $brand->id : null;

        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:140',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('brands', 'slug')->ignore($brandId),
            ],
            'logo_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
