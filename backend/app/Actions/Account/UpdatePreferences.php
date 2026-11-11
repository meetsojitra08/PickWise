<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

final class UpdatePreferences
{
    public function __construct(
        private readonly DatabaseManager $database,
    ) {}

    /**
     * Persist normalized shopping preferences, or clear to null when all values are empty.
     *
     * @param  array<int|string, string>  $favouriteCategories
     * @param  array<int|string, string>  $priorities
     */
    public function execute(
        User $user,
        int|float|string|null $budgetDefault,
        array $favouriteCategories,
        array $priorities,
    ): User {
        $normalizedBudget = $this->normalizeBudget($budgetDefault);
        $normalizedCategories = array_values(array_map(
            static fn (string $slug): string => Str::lower(trim($slug)),
            $favouriteCategories,
        ));
        $normalizedPriorities = array_values(array_map(
            static fn (string $priority): string => trim($priority),
            $priorities,
        ));

        return $this->database->transaction(static function () use (
            $user,
            $normalizedBudget,
            $normalizedCategories,
            $normalizedPriorities,
        ): User {
            $isCleared = $normalizedBudget === null
                && $normalizedCategories === []
                && $normalizedPriorities === [];

            $user->preferences = $isCleared
                ? null
                : [
                    'budget_default' => $normalizedBudget,
                    'favourite_categories' => $normalizedCategories,
                    'priorities' => $normalizedPriorities,
                ];

            $user->save();

            return $user->refresh();
        });
    }

    private function normalizeBudget(int|float|string|null $budgetDefault): int|float|null
    {
        if ($budgetDefault === null || $budgetDefault === '') {
            return null;
        }

        $numeric = (float) $budgetDefault;

        return floor($numeric) === $numeric ? (int) $numeric : round($numeric, 2);
    }
}
