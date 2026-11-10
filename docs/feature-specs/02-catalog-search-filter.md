# Feature: Catalog Search & Filters

**Phase / steps:** P2 (P2-S1 to P2-S7, S9, S10, S12) · **Depends on:** Auth shell, seed data · **Status:** Not started

## 1. Purpose
Let users quickly find products by keyword, category, brand, price, rating and specs.

## 2. User stories
- As a shopper, I want to search "gaming mouse" and see relevant results even if I mistype.
- As a shopper, I want to filter by price and key specs and sort the results.
- As a shopper, I want to share my filtered results via a link.

## 3. Functional requirements
1. Must: `GET /products` supports `q`, `category`, `brand[]`, `price_min/max`, `rating_min`, `availability`, `spec[...]`, `sort`, pagination (24 default, max 48).
2. Must: only published products are returned.
3. Must: filter facets per category (price range, brands, filterable specs) come from `spec_definitions`, not hard-coded.
4. Must: sorting by relevance, price, rating, value, newest.
5. Must: filters live in the URL query string.
6. Should: Postgres full-text search plus `pg_trgm` typo tolerance (P2-S7).
7. Should: command-palette style global search with suggestions (P2-S12).
8. Should: applied-filter chips with "Clear all".

## 4. UI
- Catalog page: filter panel (left on desktop, bottom sheet on mobile), result count, sort select, product grid (`ProductCard`), pagination.
- States: skeleton grid, empty ("No products match these filters. Clear a filter or widen the price range."), error with retry.
- Home search box and header search open the same results page.

## 5. API & data
`GET /categories`, `GET /categories/{slug}/filters`, `GET /products` · tables `categories`, `brands`, `products`, `spec_definitions`, `product_specs`.

## 6. Validation & rules
- Validate every query param; ignore unknown spec keys safely. `per_page` ≤ 48. Price min ≤ max.
- Default sort: relevance when `q` is present, otherwise value.
- Escape search input; use bindings only.

## 7. Edge cases
- Empty search, very long search, special characters.
- Filter combination returns zero results.
- Category without filterable specs.
- Page number beyond the last page.

## 8. Acceptance criteria
- [ ] Searching "laptp" (typo) still finds laptops (once P2-S7 is done).
- [ ] Changing a filter updates the URL and results; reloading the URL restores the same view.
- [ ] Price and spec filters never return products outside the range.
- [ ] Results load with no N+1 queries (verified in a test).
- [ ] Layout works at 320px.

## 9. Tests
- Backend: each filter alone and combined, sorting, pagination, unpublished hidden, validation errors.
- Frontend: filter panel updates the URL; empty and error states.

## 10. Out of scope
Saved searches, search history, voice search.
