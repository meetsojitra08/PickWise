<?php

declare(strict_types=1);

namespace App\Data\Compare;

final class CompareVerdictProduct
{
    /**
     * @param  list<string>  $strengths
     * @param  list<string>  $weaknesses
     */
    public function __construct(
        public readonly int $productId,
        public readonly string $name,
        public readonly array $strengths,
        public readonly array $weaknesses,
    ) {}

    /**
     * @return array{product_id: int, name: string, strengths: list<string>, weaknesses: list<string>}
     */
    public function toArray(): array
    {
        return [
            'product_id' => $this->productId,
            'name' => $this->name,
            'strengths' => $this->strengths,
            'weaknesses' => $this->weaknesses,
        ];
    }
}
