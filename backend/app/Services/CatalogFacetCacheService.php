<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Catalog\CategoryFilterFacets;
use App\Models\Category;
use Closure;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

/**
 * Manages Redis caching and targeted invalidation for catalog filter facets.
 */
final class CatalogFacetCacheService
{
    private const string CACHE_PREFIX = 'pickwise:catalog:facets:';

    private readonly int $ttl;

    public function __construct(
        private readonly CacheRepository $cache,
        ConfigRepository $config,
    ) {
        $this->ttl = max(60, (int) $config->get('catalog.facets_cache_ttl', 3600));
    }

    /**
     * Retrieve cached filter facets for a category slug or compute and store them in Redis.
     *
     * @param  Closure(): CategoryFilterFacets  $compute
     */
    public function remember(string $slug, Closure $compute): CategoryFilterFacets
    {
        $cacheKey = $this->keyForSlug($slug);

        /** @var CategoryFilterFacets $facets */
        $facets = $this->cache->remember($cacheKey, $this->ttl, $compute);

        return $facets;
    }

    /**
     * Invalidate cached filter facets for a specific category slug.
     */
    public function forget(string $slug): bool
    {
        return $this->cache->forget($this->keyForSlug($slug));
    }

    /**
     * Invalidate cached facets for a category and all its ancestor categories.
     */
    public function forgetForCategory(Category|int|string|null $category): void
    {
        if ($category === null) {
            return;
        }

        if (is_string($category)) {
            $this->forget($category);

            /** @var Category|null $model */
            $model = Category::query()->where('slug', $category)->first();
            if ($model instanceof Category && $model->parent_id !== null) {
                $this->forgetAncestors($model->parent_id);
            }

            return;
        }

        $model = is_int($category)
            ? Category::query()->find($category)
            : $category;

        if (! $model instanceof Category) {
            return;
        }

        $this->forget($model->slug);

        if ($model->parent_id !== null) {
            $this->forgetAncestors($model->parent_id);
        }
    }

    /**
     * Invalidate cached facets across all known categories.
     */
    public function flush(): void
    {
        /** @var list<string> $slugs */
        $slugs = Category::query()->pluck('slug')->all();

        foreach ($slugs as $slug) {
            $this->forget($slug);
        }
    }

    /**
     * Invalidate all ancestor categories up to the root.
     */
    private function forgetAncestors(int $parentId): void
    {
        $currentId = $parentId;
        $visited = [];

        while ($currentId !== null && ! isset($visited[$currentId])) {
            $visited[$currentId] = true;

            /** @var Category|null $parent */
            $parent = Category::query()->find($currentId);

            if (! $parent instanceof Category) {
                break;
            }

            $this->forget($parent->slug);
            $currentId = $parent->parent_id;
        }
    }

    private function keyForSlug(string $slug): string
    {
        return self::CACHE_PREFIX.trim($slug);
    }
}
