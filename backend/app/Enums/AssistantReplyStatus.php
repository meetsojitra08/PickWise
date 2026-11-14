<?php

declare(strict_types=1);

namespace App\Enums;

enum AssistantReplyStatus: string
{
    case Ok = 'ok';
    case Fallback = 'fallback';
    case Error = 'error';
}
