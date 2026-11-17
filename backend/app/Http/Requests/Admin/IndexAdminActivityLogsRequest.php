<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\AdminActivityLog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

final class IndexAdminActivityLogsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', AdminActivityLog::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'admin_id' => ['nullable', 'integer', 'exists:users,id'],
            'action' => ['nullable', 'string', 'max:100'],
            'subject_type' => ['nullable', 'string', 'max:100'],
            'search' => ['nullable', 'string', 'max:100'],
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $startDateStr = $this->query('start_date') ?? $this->query('from') ?? $this->input('start_date') ?? $this->input('from');
                $endDateStr = $this->query('end_date') ?? $this->query('to') ?? $this->input('end_date') ?? $this->input('to');

                if ($startDateStr !== null && $endDateStr !== null) {
                    try {
                        $start = Carbon::parse((string) $startDateStr, 'UTC')->startOfDay();
                        $end = Carbon::parse((string) $endDateStr, 'UTC')->endOfDay();

                        if ($end->isBefore($start)) {
                            $validator->errors()->add('end_date', 'The end date must be on or after the start date.');
                        } elseif ($start->diffInDays($end) > 90) {
                            $validator->errors()->add('start_date', 'The date range may not exceed 90 days.');
                        }
                    } catch (\Throwable) {
                        // Handled by date_format rules
                    }
                }
            },
        ];
    }

    /**
     * Resolved start of query window in UTC.
     */
    public function startDate(): Carbon
    {
        $input = $this->query('start_date') ?? $this->query('from') ?? $this->input('start_date') ?? $this->input('from');

        if ($input !== null) {
            return Carbon::parse((string) $input, 'UTC')->startOfDay();
        }

        return Carbon::now('UTC')->subDays(29)->startOfDay();
    }

    /**
     * Resolved end of query window in UTC.
     */
    public function endDate(): Carbon
    {
        $input = $this->query('end_date') ?? $this->query('to') ?? $this->input('end_date') ?? $this->input('to');

        if ($input !== null) {
            return Carbon::parse((string) $input, 'UTC')->endOfDay();
        }

        return Carbon::now('UTC')->endOfDay();
    }
}
