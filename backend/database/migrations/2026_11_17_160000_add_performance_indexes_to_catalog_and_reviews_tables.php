<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->getConnection())->table('products', function (Blueprint $table): void {
            $table->index(['category_id', 'is_published', 'value_score'], 'products_category_published_value_score_index');
            $table->index(['category_id', 'is_published', 'created_at'], 'products_category_published_created_at_index');
            $table->index(['category_id', 'is_published', 'rating_avg'], 'products_category_published_rating_avg_index');
            $table->index(['is_published', 'value_score'], 'products_published_value_score_index');
        });

        Schema::connection($this->getConnection())->table('reviews', function (Blueprint $table): void {
            $table->index(['product_id', 'status', 'created_at'], 'reviews_product_status_created_at_index');
            $table->index(['product_id', 'status', 'rating'], 'reviews_product_status_rating_index');
        });

        Schema::connection($this->getConnection())->table('product_specs', function (Blueprint $table): void {
            $table->index(['spec_definition_id', 'product_id'], 'product_specs_spec_def_product_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->table('product_specs', function (Blueprint $table): void {
            $table->dropIndex('product_specs_spec_def_product_id_index');
        });

        Schema::connection($this->getConnection())->table('reviews', function (Blueprint $table): void {
            $table->dropIndex('reviews_product_status_rating_index');
            $table->dropIndex('reviews_product_status_created_at_index');
        });

        Schema::connection($this->getConnection())->table('products', function (Blueprint $table): void {
            $table->dropIndex('products_published_value_score_index');
            $table->dropIndex('products_category_published_rating_avg_index');
            $table->dropIndex('products_category_published_created_at_index');
            $table->dropIndex('products_category_published_value_score_index');
        });
    }
};
