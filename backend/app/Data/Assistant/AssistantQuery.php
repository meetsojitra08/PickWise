<?php

declare(strict_types=1);

namespace App\Data\Assistant;

/**
 * Validated shopper request for the assistant: free text plus the controls the
 * shopper picked, so the model never has to guess a budget or category.
 */
final readonly class AssistantQuery
{
    public function __construct(
        public string $message,
        public ?string $categorySlug = null,
        public ?string $budgetMax = null,
    ) {}

    public function hasBudget(): bool
    {
        return $this->budgetMax !== null;
    }

    public function hasCategory(): bool
    {
        return $this->categorySlug !== null;
    }
}
