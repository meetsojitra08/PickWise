# Database Schema (PostgreSQL)

Redis is used only for cache, queue, sessions and counters; every real record lives in these PostgreSQL tables.

Conventions: `snake_case`, plural table names, `bigint` ids, `created_at`/`updated_at` on every table, foreign keys with explicit `ON DELETE` behaviour, `jsonb` for flexible structured data, soft deletes only where noted.

## Entity overview

```
users ─┬─< wishlist_items >─ products >─ categories
       ├─< comparisons ─< comparison_items >─ products
       ├─< reviews >─ products
       ├─< ai_conversations ─< ai_messages
       ├─< ai_usage_logs
       └─< admin_activity_logs

products ─┬─< product_images
          ├─< product_specs >─ spec_definitions >─ categories
          ├─< price_history
          ├── review_summaries (1:1)
          └─> brands
```

## Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| name | varchar(120) | |
| email | varchar unique | indexed |
| password | varchar | hashed |
| role | varchar(20) | enum `customer` \| `admin`, default `customer`, indexed |
| preferences | jsonb null | `{budget_default, favourite_categories[], priorities[]}` |
| is_active | boolean | default true (admin can deactivate) |
| email_verified_at | timestamp null | |
| remember_token | varchar | |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| parent_id | bigint null FK → categories | optional nesting, `nullOnDelete` |
| name | varchar(120) | |
| slug | varchar unique | |
| description | text null | |
| image_path | varchar null | |
| sort_order | int | default 0 |
| is_active | boolean | default true |

### brands
`id`, `name`, `slug` unique, `logo_path` null.

### products
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| category_id | FK → categories | `restrictOnDelete`, indexed |
| brand_id | FK → brands | `restrictOnDelete`, indexed |
| name | varchar(200) | |
| slug | varchar unique | |
| summary | varchar(300) | one-liner for cards |
| description | text | |
| price | numeric(12,2) | indexed |
| currency | char(3) | default `INR` |
| availability | varchar(20) | `in_stock` \| `low_stock` \| `out_of_stock` |
| store_url | varchar null | outbound link |
| rating_avg | numeric(3,2) | denormalised from approved reviews |
| rating_count | int | denormalised |
| value_score | smallint null | 0 to 100, computed (see below) |
| is_published | boolean | default true, indexed |
| search_vector | tsvector | generated/maintained column, GIN index |
| deleted_at | timestamp null | soft delete |

Indexes: `(category_id, is_published, price)`, `(brand_id)`, `GIN(search_vector)`, `GIN(name gin_trgm_ops)`, `(rating_avg desc)`.

### product_images
`id`, `product_id` FK cascade, `path`, `alt_text`, `sort_order`, `is_primary` boolean.

### spec_definitions
Defines which specs exist for a category so filters and comparison tables are generated from data, not hard-coded.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| category_id | FK cascade | |
| key | varchar | e.g. `ram_gb` |
| label | varchar | e.g. "RAM" |
| unit | varchar null | e.g. "GB" |
| data_type | varchar | `number` \| `text` \| `boolean` |
| is_filterable | boolean | shows in filter panel |
| is_comparable | boolean | shows in compare table |
| higher_is_better | boolean null | lets the UI highlight winners |
| sort_order | int | |

Unique `(category_id, key)`.

### product_specs
`id`, `product_id` FK cascade, `spec_definition_id` FK cascade, `value_text` null, `value_number` numeric null, `value_bool` boolean null. Unique `(product_id, spec_definition_id)`. Index `(spec_definition_id, value_number)`.

### price_history
`id`, `product_id` FK cascade, `price` numeric(12,2), `recorded_at` date. Index `(product_id, recorded_at)`. Seeded and extended by admin price edits.

### reviews
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| product_id | FK cascade | indexed |
| user_id | FK null `nullOnDelete` | seeded reviews may have no user |
| author_name | varchar null | for seeded reviews |
| rating | smallint | 1 to 5, check constraint |
| title | varchar(150) | |
| body | text | |
| status | varchar(20) | `pending` \| `approved` \| `rejected`, indexed |
| moderated_by | FK null → users | |
| moderated_at | timestamp null | |

Unique `(product_id, user_id)` where `user_id` is not null (one review per user per product).

### review_summaries
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| product_id | FK unique cascade | 1:1 |
| summary | text | 2 to 3 sentences |
| pros | jsonb | list of short strings |
| cons | jsonb | list of short strings |
| sentiment | varchar(20) | `positive` \| `mixed` \| `negative` |
| reviews_count | int | |
| generated_at | timestamp | |

### wishlist_items
`id`, `user_id` FK cascade, `product_id` FK cascade, unique `(user_id, product_id)`.

### comparisons / comparison_items
`comparisons`: `id`, `user_id` FK cascade, `name` varchar, `ai_verdict` jsonb null, `share_token` char(32) unique null (null = private; set when the owner clicks Share, cleared to stop sharing).
`comparison_items`: `id`, `comparison_id` FK cascade, `product_id` FK cascade, `position` smallint. Unique `(comparison_id, product_id)`. Enforce 2 to 4 items in the Action, not only the UI.

### ai_conversations / ai_messages
`ai_conversations`: `id`, `user_id` FK null cascade (guests use a session key), `session_key` varchar null, `title` varchar null, `last_message_at`.
`ai_messages`: `id`, `conversation_id` FK cascade, `role` (`user` \| `assistant`), `content` text, `payload` jsonb null (structured recommendations: product ids, reasons, constraints applied), `status` (`ok` \| `fallback` \| `error`).

### ai_usage_logs
`id`, `user_id` null, `feature` (`assistant` \| `compare` \| `review_summary`), `model`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `status` (`ok` \| `error` \| `rate_limited`), `error_code` null, `created_at`. Index `(user_id, created_at)`, `(feature, created_at)`. Used for quotas and the admin analytics dashboard.

### admin_activity_logs
`id`, `admin_id` FK (`restrictOnDelete` — admins are deactivated, never deleted, so audit entries keep their author), `action` (e.g. `product.updated`), `subject_type`, `subject_id`, `changes` jsonb null (before/after diff), `ip_address`, `created_at`. Append-only: no update or delete endpoints exist.

## Value Score (transparent, explainable)

Computed per product within its category, stored in `products.value_score`, recalculated on spec/price/review change by a service.

```
value_score = round( 100 * (
    0.40 * spec_strength_percentile   // weighted comparable specs, higher_is_better aware
  + 0.30 * rating_confidence          // Bayesian-adjusted rating (avoids 1 review = 5 stars)
  + 0.30 * price_efficiency           // spec strength per unit price, percentile in category
) )
```

Document the formula on the product page tooltip. Being able to explain this is the point.

## Seeding plan

- 5 to 6 categories (e.g. smartphones, laptops, headphones, monitors, keyboards, smartwatches), each with 8 to 12 realistic products.
- Spec definitions per category, 6 to 10 reviews per product (mix of sentiment, some deliberately noisy), 6 months of price history.
- Seeders must be deterministic. Factories for tests are separate from showcase seed data.
- Do not copy real retailer content or images you do not have rights to. Use original copy and licensed or generated placeholder imagery.
