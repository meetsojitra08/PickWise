# Feature: Product Detail

**Phase / steps:** P2 (P2-S8, S11, S13 to S15) · **Depends on:** Catalog, reviews (later), AI summary (later) · **Status:** Not started

## 1. Purpose
Give everything needed to judge one product in a single page: images, price, specs, ratings, value score, price history, similar products.

## 2. User stories
- As a shopper, I want clear specs and photos so I understand what the product is.
- As a shopper, I want to know whether the price is a good deal.
- As a shopper, I want to add the product to my wishlist or comparison from here.

## 3. Functional requirements
1. Must: `GET /products/{slug}` returns product, brand, category, images, grouped specs, rating, availability, value score.
2. Must: gallery with thumbnails; primary image first; alt text.
3. Must: grouped spec table using `spec_definitions` labels and units.
4. Must: "View on store" outbound link (`rel="noopener noreferrer"`, opens in a new tab).
5. Must: wishlist and compare toggles.
6. Must: Value Score with a tooltip explaining how it's calculated.
7. Should: price history chart with min/max markers (P2-S14).
8. Should: similar products (same category, close price/specs) (P2-S15).
9. Should: AI review summary and reviews sections (added in P3/P5).

## 4. UI
Gallery (left) + key facts and price (right, sticky on desktop) → review summary → specs → price history → reviews → similar products. Mobile: sticky bottom bar with price and primary action.
States: loading skeleton, 404 ("This product isn't available."), out-of-stock badge.

## 5. API & data
`GET /products/{slug}`, `/products/{slug}/price-history`, `/products/{slug}/similar` · tables `products`, `product_images`, `product_specs`, `price_history`.

## 6. Validation & rules
- Unpublished or soft-deleted products return 404 to the public.
- Value Score formula is documented in `database-schema.md`; recalculated by a service on price/spec/review change.
- Price shown with currency formatting and tabular numerals.

## 7. Edge cases
- Product with no images (placeholder), no specs, or no reviews.
- Very long names or spec values.
- Price history with a single point.

## 8. Acceptance criteria
- [ ] Opening a valid slug shows all sections without layout shift.
- [ ] An unknown slug shows the 404 state, not a crash.
- [ ] Toggling wishlist/compare updates immediately and persists.
- [ ] The Value Score tooltip explains the formula in plain language.
- [ ] The price history chart shows recorded prices, marks the minimum and maximum, and provides an accessible table alternative.

## 9. Tests
- Backend: detail resource shape, 404s, Value Score calculator (unit tests with fixed numbers).
- Frontend: renders sections; missing-data fallbacks.

## 10. Out of scope
Q&A section, product variants, 360° view.
