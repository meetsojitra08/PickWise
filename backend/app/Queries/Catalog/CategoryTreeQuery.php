<?php

declare(strict_types=1);

namespace App\Queries\Catalog;

use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

final class CategoryTreeQuery
{
    /**
     * Fetch active categories as an ordered tree with published product counts and no lazy loading.
     *
     * @return Collection<int, Category>
     */
    public function get(): Collection
    {
        /** @var Collection<int, Category> $activeCategories */
        $activeCategories = Category::query()
            ->active()
            ->ordered()
            ->withCount([
                'products' => static fn (Builder $query): Builder => $query->where('is_published', true),
            ])
            ->get();

        /** @var array<int, list<Category>> $childrenByParentId */
        $childrenByParentId = [];

        foreach ($activeCategories as $category) {
            $parentKey = $category->parent_id ?? 0;
            $childrenByParentId[$parentKey][] = $category;
        }

        return $this->buildBranch($childrenByParentId, 0);
    }

    /**
     * Recursively attach preloaded child collections and accumulate subtree product counts.
     *
     * @param  array<int, list<Category>>  $childrenByParentId
     * @return Collection<int, Category>
     */
    private function buildBranch(array $childrenByParentId, int $parentId): Collection
    {
        $nodes = $childrenByParentId[$parentId] ?? [];

        foreach ($nodes as $node) {
            $children = $this->buildBranch($childrenByParentId, $node->id);
            $node->setRelation('children', $children);

            $directCount = $this->readIntAttribute($node, 'products_count');
            $descendantCount = 0;

            foreach ($children as $child) {
                $descendantCount += $this->readIntAttribute($child, 'products_count');
            }

            $node->setAttribute('products_count', $directCount + $descendantCount);
        }

        return new Collection($nodes);
    }

    private function readIntAttribute(Category $category, string $attribute): int
    {
        $value = $category->getAttribute($attribute);

        return is_numeric($value) ? (int) $value : 0;
    }
}
