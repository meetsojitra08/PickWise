<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Attach defense-in-depth security headers to API responses so deployments
 * remain protected even outside the Docker Nginx reverse proxy.
 */
final class AddSecurityHeaders
{
    public const string PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()';

    public const string API_CSP = "default-src 'none'; frame-ancestors 'none'";

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff', false);
        $response->headers->set('X-Frame-Options', 'DENY', false);
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', false);
        $response->headers->set('Permissions-Policy', self::PERMISSIONS_POLICY, false);
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin', false);
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin', false);

        if ($request->is('api/*') || $request->is('sanctum/*')) {
            $response->headers->set('Content-Security-Policy', self::API_CSP, false);
        }

        return $response;
    }
}
