<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;

/**
 * Resolves active category visibility, ensuring categories under inactive ancestors stay hidden.
 */
final class ActiveCategoryScope
{
    /**
     * Return all active category IDs whose entire ancestor chain is also active.
     *
     * @return list<int>
     */
    public function reachableIds(): array
    {
        $graph = $this->loadGraph();

        return $this->collectSubtreeIds(0, $graph['children_by_parent']);
    }

    /**
     * Return the active category ID and active descendant IDs for a slug, or an empty list if hidden/unknown.
     *
     * @return list<int>
     */
    public function descendantIdsForSlug(string $slug): array
    {
        $graph = $this->loadGraph();
        $target = $graph['by_slug'][$slug] ?? null;

        if (! $target instanceof Category) {
            return [];
        }

        $reachable = array_flip($this->collectSubtreeIds(0, $graph['children_by_parent']));

        if (! isset($reachable[$target->id])) {
            return [];
        }

        return [
            $target->id,
            ...$this->collectSubtreeIds($target->id, $graph['children_by_parent']),
        ];
    }

    /**
     * @return array{by_slug: array<string, Category>, children_by_parent: array<int, list<int>>}
     */
    private function loadGraph(): array
    {
        /** @var Collection<int, Category> $activeCategories */
        $activeCategories = Category::query()
            ->active()
            ->ordered()
            ->get(['id', 'parent_id', 'slug']);

        /** @var array<string, Category> $bySlug */
        $bySlug = [];
        /** @var array<int, list<int>> $childrenByParent */
        $childrenByParent = [];

        foreach ($activeCategories as $category) {
            $bySlug[$category->slug] = $category;
            $parentKey = $category->parent_id ?? 0;
            $childrenByParent[$parentKey][] = $category->id;
        }

        return [
            'by_slug' => $bySlug,
            'children_by_parent' => $childrenByParent,
        ];
    }

    /**
     * @param  array<int, list<int>>  $childrenByParent
     * @return list<int>
     */
    private function collectSubtreeIds(int $rootParentId, array $childrenByParent): array
    {
        $ids = [];
        $visited = [];
        $queue = $childrenByParent[$rootParentId] ?? [];

        while ($queue !== []) {
            $currentId = array_shift($queue);

            if (isset($visited[$currentId])) {
                continue;
            }

            $visited[$currentId] = true;
            $ids[] = $currentId;

            foreach ($childrenByParent[$currentId] ?? [] as $childId) {
                if (! isset($visited[$childId])) {
                    $queue[] = $childId;
                }
            }
        }

        return $ids;
    }
}
