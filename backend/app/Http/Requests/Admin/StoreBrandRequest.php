<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Brand;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Brand::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && (! $this->has('slug') || blank($this->input('slug')))) {
            $this->merge([
                'slug' => Str::slug((string) $this->input('name')),
            ]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'slug' => [
                'required',
                'string',
                'max:140',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('brands', 'slug'),
            ],
            'logo_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
