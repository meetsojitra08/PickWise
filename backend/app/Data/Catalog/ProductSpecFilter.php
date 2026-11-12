<?php

declare(strict_types=1);

namespace App\Data\Catalog;

use App\Enums\SpecDataType;

/**
 * Typed spec filter constraint resolved from `spec[key]` query parameters.
 */
final readonly class ProductSpecFilter
{
    /**
     * @param  list<int>  $specDefinitionIds
     * @param  list<string>  $textValues
     */
    public function __construct(
        public string $key,
        public SpecDataType $dataType,
        public array $specDefinitionIds,
        public ?float $min = null,
        public ?float $max = null,
        public ?float $exactNumber = null,
        public ?bool $boolValue = null,
        public array $textValues = [],
    ) {}
}
