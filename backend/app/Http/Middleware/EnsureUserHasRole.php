<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Ensure the authenticated user is active and holds at least one required role.
     *
     * @param  Closure(Request): Response  $next
     *
     * @throws AuthenticationException
     * @throws AuthorizationException
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        if ($roles === []) {
            throw new InvalidArgumentException('At least one role must be provided to the role middleware.');
        }

        $allowedRoles = array_map(static function (string $role): UserRole {
            $resolved = UserRole::tryFrom($role);

            if ($resolved === null) {
                throw new InvalidArgumentException(sprintf('Invalid role "%s" passed to role middleware.', $role));
            }

            return $resolved;
        }, $roles);

        if (! $user->isActive()) {
            throw new AuthorizationException('Your account has been deactivated.');
        }

        if (! in_array($user->role, $allowedRoles, true)) {
            throw new AuthorizationException('You do not have permission to access this resource.');
        }

        return $next($request);
    }
}
