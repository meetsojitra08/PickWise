<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Models\AdminActivityLog;
use App\Support\LikePattern;
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
            $escapedSubjectSuffix = '%\\'.LikePattern::escape($cleanSubject);
            $query->where(static function ($q) use ($cleanSubject, $escapedSubjectSuffix): void {
                $q->where('subject_type', $cleanSubject)
                    ->orWhereRaw("subject_type LIKE ? ESCAPE '!'", [$escapedSubjectSuffix]);
            });
        }

        if ($search !== null && trim($search) !== '') {
            $trimmedSearch = trim($search);
            $pattern = LikePattern::containsLower($trimmedSearch);

            $query->where(static function ($q) use ($pattern, $trimmedSearch): void {
                $q->whereRaw("LOWER(action) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereRaw("LOWER(ip_address) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereHas('admin', static function ($adminQuery) use ($pattern): void {
                        $adminQuery->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])
                            ->orWhereRaw("LOWER(email) LIKE ? ESCAPE '!'", [$pattern]);
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
