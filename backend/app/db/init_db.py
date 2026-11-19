import asyncio

from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine


async def init_database():
    print("Connecting to PostgreSQL and creating extensions/tables...")
    async with engine.begin() as conn:
        # Enable required PostgreSQL extensions
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent;"))

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

        # Create search vector helper function & triggers
        await conn.execute(
            text(
                """
            CREATE OR REPLACE FUNCTION pickwise_build_product_search_vector(
                p_name text,
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
                    || setweight(
                        to_tsvector('english', unaccent(coalesce(v_brand_name, ''))), 'A'
                    )
                    || setweight(
                        to_tsvector('english', unaccent(coalesce(v_category_name, ''))), 'B'
                    )
                    || setweight(
                        to_tsvector('english', unaccent(coalesce(p_description, ''))), 'C'
                    );
            END;
            $$;
            """
            )
        )

        await conn.execute(
            text(
                """
            CREATE OR REPLACE FUNCTION pickwise_products_sync_search_vector()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                NEW.search_vector := pickwise_build_product_search_vector(
                    NEW.name,
                    NEW.description,
                    NEW.brand_id,
                    NEW.category_id
                );
                RETURN NEW;
            END;
            $$;
            """
            )
        )

        await conn.execute(
            text("DROP TRIGGER IF EXISTS trg_products_sync_search_vector ON products;")
        )
        await conn.execute(
            text(
                """
            CREATE TRIGGER trg_products_sync_search_vector
            BEFORE INSERT OR UPDATE OF name, description, brand_id, category_id
            ON products
            FOR EACH ROW
            EXECUTE FUNCTION pickwise_products_sync_search_vector();
            """
            )
        )

        # Performance and Search Indexes
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS products_search_vector_gin_idx "
                "ON products USING gin (search_vector);"
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS products_name_trgm_gin_idx "
                "ON products USING gin (name gin_trgm_ops);"
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS brands_name_trgm_gin_idx "
                "ON brands USING gin (name gin_trgm_ops);"
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_products_category_published_price "
                "ON products (category_id, is_published, price);"
            )
        )

    print("PostgreSQL extensions, tables, triggers, and indexes initialized successfully!")


if __name__ == "__main__":
    asyncio.run(init_database())
