<?php

declare(strict_types=1);

namespace App\Data\Assistant;

use App\Models\Product;

/**
 * One product the assistant chose from the database candidates. The product is
 * loaded from the database, while reason and tradeoffs are the model's words.
 */
final readonly class AssistantRecommendation
{
    /**
     * @param  list<string>  $tradeoffs
     */
    public function __construct(
        public Product $product,
        public ?string $reason,
        public array $tradeoffs = [],
    ) {}
}
