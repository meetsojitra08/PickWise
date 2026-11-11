<?php

declare(strict_types=1);

namespace App\Enums;

enum SpecDataType: string
{
    case Number = 'number';
    case Text = 'text';
    case Boolean = 'boolean';

    /**
     * Return all backed string values for validation and schema checks.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $dataType): string => $dataType->value,
            self::cases(),
        );
    }

    public function label(): string
    {
        return match ($this) {
            self::Number => 'Number',
            self::Text => 'Text',
            self::Boolean => 'Boolean',
        };
    }
}
