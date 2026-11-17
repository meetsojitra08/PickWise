<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('performance indexes migration applies and rolls back cleanly', function (): void {
    expect(Schema::hasIndex('products', 'products_category_published_value_score_index'))->toBeTrue()
        ->and(Schema::hasIndex('products', 'products_category_published_created_at_index'))->toBeTrue()
        ->and(Schema::hasIndex('products', 'products_category_published_rating_avg_index'))->toBeTrue()
        ->and(Schema::hasIndex('products', 'products_published_value_score_index'))->toBeTrue()
        ->and(Schema::hasIndex('reviews', 'reviews_product_status_created_at_index'))->toBeTrue()
        ->and(Schema::hasIndex('reviews', 'reviews_product_status_rating_index'))->toBeTrue()
        ->and(Schema::hasIndex('product_specs', 'product_specs_spec_def_product_id_index'))->toBeTrue();

    $migration = require database_path('migrations/2026_11_17_160000_add_performance_indexes_to_catalog_and_reviews_tables.php');
    $migration->down();

    expect(Schema::hasIndex('products', 'products_category_published_value_score_index'))->toBeFalse()
        ->and(Schema::hasIndex('products', 'products_category_published_created_at_index'))->toBeFalse()
        ->and(Schema::hasIndex('products', 'products_category_published_rating_avg_index'))->toBeFalse()
        ->and(Schema::hasIndex('products', 'products_published_value_score_index'))->toBeFalse()
        ->and(Schema::hasIndex('reviews', 'reviews_product_status_created_at_index'))->toBeFalse()
        ->and(Schema::hasIndex('reviews', 'reviews_product_status_rating_index'))->toBeFalse()
        ->and(Schema::hasIndex('product_specs', 'product_specs_spec_def_product_id_index'))->toBeFalse();

    $migration->up();

    expect(Schema::hasIndex('products', 'products_category_published_value_score_index'))->toBeTrue()
        ->and(Schema::hasIndex('products', 'products_category_published_created_at_index'))->toBeTrue()
        ->and(Schema::hasIndex('products', 'products_category_published_rating_avg_index'))->toBeTrue()
        ->and(Schema::hasIndex('products', 'products_published_value_score_index'))->toBeTrue()
        ->and(Schema::hasIndex('reviews', 'reviews_product_status_created_at_index'))->toBeTrue()
        ->and(Schema::hasIndex('reviews', 'reviews_product_status_rating_index'))->toBeTrue()
        ->and(Schema::hasIndex('product_specs', 'product_specs_spec_def_product_id_index'))->toBeTrue();
});
