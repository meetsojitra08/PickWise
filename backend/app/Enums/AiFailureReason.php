<?php

declare(strict_types=1);

namespace App\Enums;

enum AiFailureReason: string
{
    case NotConfigured = 'not_configured';
    case Connection = 'connection';
    case HttpError = 'http_error';
    case InvalidJson = 'invalid_json';
}
