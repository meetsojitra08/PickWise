<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class AuditLogger
{
    /**
     * Exact attribute names whose values must be redacted from audit logs.
     *
     * @var list<string>
     */
    private const EXACT_SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'remember_token',
        'token',
        'share_token',
        'access_token',
        'refresh_token',
        'csrf_token',
        'api_key',
        'secret',
        'secret_key',
        'client_secret',
        'prompt',
    ];

    public function __construct(
        private readonly ?Request $request = null,
    ) {}

    /**
     * Record an administrative activity log entry.
     *
     * @param  array<string, mixed>|null  $changes
     */
    public function record(
        User $admin,
        string $action,
        ?Model $subject = null,
        ?array $changes = null,
        ?string $ipAddress = null,
    ): AdminActivityLog {
        if (! $admin->isAdmin()) {
            throw new InvalidArgumentException('Only administrators can author activity logs.');
        }

        $sanitizedChanges = $changes !== null ? $this->sanitize($changes) : null;
        $ip = $ipAddress ?? $this->request?->ip();

        return AdminActivityLog::query()->create([
            'admin_id' => $admin->id,
            'action' => trim($action),
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'changes' => $sanitizedChanges,
            'ip_address' => $ip,
            'created_at' => now(),
        ]);
    }

    /**
     * Log the creation of a domain resource.
     *
     * @param  array<string, mixed>|null  $attributes
     */
    public function logCreated(
        User $admin,
        Model $subject,
        ?array $attributes = null,
        ?string $action = null,
        ?string $ipAddress = null,
    ): AdminActivityLog {
        $actionName = $action ?? $this->deriveAction($subject, 'created');
        $after = $attributes ?? $subject->getAttributes();

        return $this->record(
            admin: $admin,
            action: $actionName,
            subject: $subject,
            changes: ['after' => $after],
            ipAddress: $ipAddress,
        );
    }

    /**
     * Log an update to a domain resource by computing a before/after diff.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    public function logUpdated(
        User $admin,
        Model $subject,
        array $before,
        array $after,
        ?string $action = null,
        ?string $ipAddress = null,
    ): AdminActivityLog {
        $actionName = $action ?? $this->deriveAction($subject, 'updated');
        $diff = $this->computeDiff($before, $after);

        return $this->record(
            admin: $admin,
            action: $actionName,
            subject: $subject,
            changes: $diff,
            ipAddress: $ipAddress,
        );
    }

    /**
     * Log the deletion of a domain resource.
     *
     * @param  array<string, mixed>|null  $attributes
     */
    public function logDeleted(
        User $admin,
        Model $subject,
        ?array $attributes = null,
        ?string $action = null,
        ?string $ipAddress = null,
    ): AdminActivityLog {
        $actionName = $action ?? $this->deriveAction($subject, 'deleted');
        $before = $attributes ?? $subject->getAttributes();

        return $this->record(
            admin: $admin,
            action: $actionName,
            subject: $subject,
            changes: ['before' => $before],
            ipAddress: $ipAddress,
        );
    }

    /**
     * Compute a key-by-key before/after diff containing only the changed attributes.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array{before: array<string, mixed>, after: array<string, mixed>}
     */
    public function computeDiff(array $before, array $after): array
    {
        $diffBefore = [];
        $diffAfter = [];

        $allKeys = array_unique(array_merge(array_keys($before), array_keys($after)));

        foreach ($allKeys as $key) {
            $hasOld = array_key_exists($key, $before);
            $hasNew = array_key_exists($key, $after);

            $oldVal = $hasOld ? $before[$key] : null;
            $newVal = $hasNew ? $after[$key] : null;

            if ($oldVal !== $newVal) {
                $diffBefore[$key] = $oldVal;
                $diffAfter[$key] = $newVal;
            }
        }

        return [
            'before' => $diffBefore,
            'after' => $diffAfter,
        ];
    }

    /**
     * Recursively sanitize payload to strip passwords, tokens, API keys, and prompts.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function sanitize(array $payload): array
    {
        $sanitized = [];

        foreach ($payload as $key => $value) {
            $stringKey = (string) $key;

            if ($this->isSensitiveKey($stringKey)) {
                $sanitized[$key] = '[REDACTED]';

                continue;
            }

            if (is_array($value)) {
                /** @var array<string, mixed> $value */
                $sanitized[$key] = $this->sanitize($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Determine whether an attribute key represents sensitive data.
     */
    public function isSensitiveKey(string $key): bool
    {
        $normalized = Str::lower($key);

        if (in_array($normalized, self::EXACT_SENSITIVE_KEYS, true)) {
            return true;
        }

        if (str_ends_with($normalized, '_token')
            || str_ends_with($normalized, '_secret')
            || str_ends_with($normalized, '_password')
            || (str_ends_with($normalized, '_key') && str_contains($normalized, 'api'))
        ) {
            return true;
        }

        return false;
    }

    /**
     * Derive a standard action identifier (e.g. "product.updated") from a model instance.
     */
    private function deriveAction(Model $subject, string $verb): string
    {
        $entity = Str::snake(class_basename($subject));

        return "{$entity}.{$verb}";
    }
}
