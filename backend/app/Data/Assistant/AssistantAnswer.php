<?php

declare(strict_types=1);

namespace App\Data\Assistant;

use App\Enums\AssistantReplyStatus;

/**
 * A complete assistant reply, including the products the UI should render and
 * whether the text came from the model or from the catalog fallback.
 */
final readonly class AssistantAnswer
{
    /**
     * @param  list<AssistantRecommendation>  $recommendations
     * @param  list<AssistantRecommendation>  $alternatives
     */
    public function __construct(
        public string $content,
        public array $recommendations,
        public array $alternatives,
        public AssistantReplyStatus $status,
    ) {}
}
