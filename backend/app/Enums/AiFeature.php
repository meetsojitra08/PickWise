<?php

declare(strict_types=1);

namespace App\Enums;

enum AiFeature: string
{
    case Assistant = 'assistant';
    case Compare = 'compare';
    case ReviewSummary = 'review_summary';
}
