<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Skip on non-PostgreSQL drivers (e.g. SQLite test databases).
     */
    public function shouldRun(): bool
    {
        return $this->isPostgres();
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! $this->isPostgres()) {
            return;
        }

        $connection = DB::connection($this->getConnection());

        $connection->unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION pickwise_build_product_search_vector(
                p_name text,
                p_summary text,
                p_description text,
                p_brand_id bigint,
                p_category_id bigint
            ) RETURNS tsvector
            LANGUAGE plpgsql
            STABLE
            AS $$
            DECLARE
                v_brand_name text;
                v_category_name text;
            BEGIN
                SELECT name INTO v_brand_name FROM brands WHERE id = p_brand_id;
                SELECT name INTO v_category_name FROM categories WHERE id = p_category_id;

                RETURN
                    setweight(to_tsvector('english', unaccent(coalesce(p_name, ''))), 'A')
                    || setweight(to_tsvector('english', unaccent(coalesce(v_brand_name, ''))), 'A')
                    || setweight(to_tsvector('english', unaccent(coalesce(v_category_name, ''))), 'B')
                    || setweight(to_tsvector('english', unaccent(coalesce(p_summary, ''))), 'C')
                    || setweight(to_tsvector('english', unaccent(coalesce(p_description, ''))), 'D');
            END;
            $$;

            CREATE OR REPLACE FUNCTION pickwise_products_sync_search_vector()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                NEW.search_vector := pickwise_build_product_search_vector(
                    NEW.name,
                    NEW.summary,
                    NEW.description,
                    NEW.brand_id,
                    NEW.category_id
                );

                RETURN NEW;
            END;
            $$;

            CREATE OR REPLACE FUNCTION pickwise_brands_sync_product_search_vector()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF OLD.name IS DISTINCT FROM NEW.name THEN
                    UPDATE products
                    SET search_vector = pickwise_build_product_search_vector(
                        name,
                        summary,
                        description,
                        brand_id,
                        category_id
                    )
                    WHERE brand_id = NEW.id;
                END IF;

                RETURN NEW;
            END;
            $$;

            CREATE OR REPLACE FUNCTION pickwise_categories_sync_product_search_vector()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF OLD.name IS DISTINCT FROM NEW.name THEN
                    UPDATE products
                    SET search_vector = pickwise_build_product_search_vector(
                        name,
                        summary,
                        description,
                        brand_id,
                        category_id
                    )
                    WHERE category_id = NEW.id;
                END IF;

                RETURN NEW;
            END;
            $$;

            DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
            CREATE TRIGGER products_search_vector_trigger
            BEFORE INSERT OR UPDATE OF name, summary, description, brand_id, category_id ON products
            FOR EACH ROW
            EXECUTE FUNCTION pickwise_products_sync_search_vector();

            DROP TRIGGER IF EXISTS brands_products_search_vector_trigger ON brands;
            CREATE TRIGGER brands_products_search_vector_trigger
            AFTER UPDATE OF name ON brands
            FOR EACH ROW
            EXECUTE FUNCTION pickwise_brands_sync_product_search_vector();

            DROP TRIGGER IF EXISTS categories_products_search_vector_trigger ON categories;
            CREATE TRIGGER categories_products_search_vector_trigger
            AFTER UPDATE OF name ON categories
            FOR EACH ROW
            EXECUTE FUNCTION pickwise_categories_sync_product_search_vector();

            UPDATE products
            SET search_vector = pickwise_build_product_search_vector(
                name,
                summary,
                description,
                brand_id,
                category_id
            );
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->isPostgres()) {
            return;
        }

        $connection = DB::connection($this->getConnection());

        $connection->unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS categories_products_search_vector_trigger ON categories;
            DROP TRIGGER IF EXISTS brands_products_search_vector_trigger ON brands;
            DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
            DROP FUNCTION IF EXISTS pickwise_categories_sync_product_search_vector();
            DROP FUNCTION IF EXISTS pickwise_brands_sync_product_search_vector();
            DROP FUNCTION IF EXISTS pickwise_products_sync_search_vector();
            DROP FUNCTION IF EXISTS pickwise_build_product_search_vector(text, text, text, bigint, bigint);
            UPDATE products SET search_vector = NULL;
        SQL);
    }

    private function isPostgres(): bool
    {
        return DB::connection($this->getConnection())->getDriverName() === 'pgsql';
    }
};
