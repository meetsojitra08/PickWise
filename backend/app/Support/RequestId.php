<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Container\Container;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;

final class RequestId
{
    public const HEADER = 'X-Request-Id';

    public const ATTRIBUTE = 'request_id';

    private const VALID_PATTERN = '/^[A-Za-z0-9._-]{1,64}$/';

    /**
     * Resolve the request ID for an HTTP request, reusing a safe inbound header
     * or generating a UUID v4, and synchronize it with Laravel's log Context.
     */
    public static function resolve(Request $request): string
    {
        $existing = $request->attributes->get(self::ATTRIBUTE);

        if (is_string($existing) && $existing !== '') {
            return $existing;
        }

        $inbound = $request->header(self::HEADER);
        $requestId = is_string($inbound) && preg_match(self::VALID_PATTERN, $inbound) === 1
            ? $inbound
            : (string) Str::uuid();

        $request->attributes->set(self::ATTRIBUTE, $requestId);
        Context::add(self::ATTRIBUTE, $requestId);

        return $requestId;
    }

    /**
     * Return the active request ID from the current request or log Context, if available.
     */
    public static function current(): ?string
    {
        $container = Container::getInstance();

        if ($container->bound('request')) {
            $fromAttribute = $container->make('request')->attributes->get(self::ATTRIBUTE);

            if (is_string($fromAttribute) && $fromAttribute !== '') {
                return $fromAttribute;
            }
        }

        $fromContext = Context::get(self::ATTRIBUTE);

        return is_string($fromContext) && $fromContext !== '' ? $fromContext : null;
    }
}
