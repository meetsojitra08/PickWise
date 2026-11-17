<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Models\AdminActivityLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

final class GetAdminActivityLogs
{
    /**
     * Retrieve paginated administrative activity logs with filters.
     *
     * @return LengthAwarePaginator<int, AdminActivityLog>
     */
    public function execute(
        Carbon $startDate,
        Carbon $endDate,
        ?int $adminId = null,
        ?string $action = null,
        ?string $subjectType = null,
        ?string $search = null,
        int $perPage = 20,
        int $page = 1,
    ): LengthAwarePaginator {
        $query = AdminActivityLog::query()
            ->with(['admin:id,name,email'])
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate);

        if ($adminId !== null) {
            $query->where('admin_id', $adminId);
        }

        if ($action !== null && trim($action) !== '' && trim($action) !== 'all') {
            $query->where('action', trim($action));
        }

        if ($subjectType !== null && trim($subjectType) !== '' && trim($subjectType) !== 'all') {
            $cleanSubject = trim($subjectType);
            $query->where(static function ($q) use ($cleanSubject): void {
                $q->where('subject_type', $cleanSubject)
                    ->orWhere('subject_type', 'like', "%\\{$cleanSubject}");
            });
        }

        if ($search !== null && trim($search) !== '') {
            $trimmedSearch = trim($search);
            $needle = mb_strtolower($trimmedSearch);

            $query->where(static function ($q) use ($needle, $trimmedSearch): void {
                $q->whereRaw('LOWER(action) LIKE ?', ["%{$needle}%"])
                    ->orWhereRaw('LOWER(ip_address) LIKE ?', ["%{$needle}%"])
                    ->orWhereHas('admin', static function ($adminQuery) use ($needle): void {
                        $adminQuery->whereRaw('LOWER(name) LIKE ?', ["%{$needle}%"])
                            ->orWhereRaw('LOWER(email) LIKE ?', ["%{$needle}%"]);
                    });

                if (is_numeric($trimmedSearch)) {
                    $q->orWhere('subject_id', (int) $trimmedSearch);
                }
            });
        }

        /** @var LengthAwarePaginator<int, AdminActivityLog> $paginator */
        $paginator = $query->latest('created_at')
            ->latest('id')
            ->paginate(perPage: $perPage, page: $page);

        return $paginator;
    }
}
