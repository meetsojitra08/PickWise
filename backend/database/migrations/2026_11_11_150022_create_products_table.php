<?php

declare(strict_types=1);

use App\Enums\ProductAvailability;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $connection = DB::connection($this->getConnection());
        $isPostgres = $connection->getDriverName() === 'pgsql';

        Schema::connection($this->getConnection())->create('products', function (Blueprint $table) use ($isPostgres): void {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('brand_id')->constrained('brands')->restrictOnDelete();
            $table->string('name', 200);
            $table->string('slug')->unique();
            $table->string('summary', 300);
            $table->text('description');
            $table->decimal('price', 12, 2);
            $table->char('currency', 3)->default('INR');
            $table->string('availability', 20)->default(ProductAvailability::InStock->value);
            $table->string('store_url', 2048)->nullable();
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->smallInteger('value_score')->nullable();
            $table->boolean('is_published')->default(true);

            if ($isPostgres) {
                $table->tsvector('search_vector')->nullable();
            } else {
                // Non-PostgreSQL test drivers (e.g. SQLite) do not support native tsvector columns.
                $table->text('search_vector')->nullable();
            }

            $table->softDeletes();
            $table->timestamps();

            $table->index(['category_id', 'is_published', 'price']);
            $table->index('brand_id');
            $table->index('price');
            $table->index('is_published');

            if ($isPostgres) {
                $table->index('search_vector')->algorithm('gin');
            } else {
                $table->index('rating_avg', 'products_rating_avg_desc_index');
            }
        });

        if ($isPostgres) {
            $grammar = $connection->getSchemaGrammar();
            $wrappedTable = $grammar->wrapTable('products');
            $prefix = $connection->getTablePrefix();
            $trgmIndex = $grammar->wrap($prefix.'products_name_trgm_gin_index');
            $ratingIndex = $grammar->wrap($prefix.'products_rating_avg_desc_index');

            // Trigram GIN index and explicit DESC sort index require PostgreSQL-specific DDL.
            $connection->statement(
                "CREATE INDEX {$trgmIndex} ON {$wrappedTable} USING gin (name gin_trgm_ops)"
            );
            $connection->statement(
                "CREATE INDEX {$ratingIndex} ON {$wrappedTable} (rating_avg DESC)"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('products');
    }
};
