# Feature: Product Comparison

**Phase / steps:** P4 (P4-S3 to P4-S6) · **Depends on:** Catalog, specs · **Status:** Not started

## 1. Purpose
Show 2 to 4 products side by side so differences are obvious.

## 2. User stories
- As a shopper, I want to pick products and compare their specs, price and ratings in one table.
- As a shopper, I want the best value in each row highlighted.
- As a customer, I want to save and share a comparison.

## 3. Functional requirements
1. Must: add/remove products to a compare tray (min 2, max 4). The tray persists while navigating.
2. Must: `POST /compare` returns a spec matrix for the products, using `spec_definitions` flagged `is_comparable`.
3. Must: highlight the winning value per row using `higher_is_better`; no highlight for ties or unknown direction.
4. Must: "Show only differences" toggle.
5. Must: comparing products from different categories is blocked with a clear message.
6. Must: saved comparisons for customers (name, items), listed in the account page.
7. Should: share link that opens the same comparison for anyone (read-only), using an unguessable `share_token`; the owner can stop sharing at any time.

## 4. UI
- `CompareTray` sticky at the bottom with thumbnails and a "Compare" button (disabled until 2 items).
- Compare page: sticky product headers, `CompareMatrix`, sticky first column on mobile; AI verdict area on top (feature 09).
- States: fewer than 2 products ("Pick at least two products to compare."), loading, error.

## 5. API & data
`POST /compare`, `GET/POST /comparisons`, `GET/PATCH/DELETE /comparisons/{id}` · tables `comparisons`, `comparison_items`.

## 6. Validation & rules
- 2 to 4 distinct, published product ids, same category. Enforced on the backend, not only the UI.
- Comparison names 1 to 100 chars.

## 7. Edge cases
- A product becomes unpublished after being saved in a comparison.
- Missing spec value for one product (show "Not listed", never blank).
- Adding a fifth product.

## 8. Acceptance criteria
- [ ] Tray enforces the 2 to 4 limit and survives navigation.
- [ ] Winners are highlighted correctly for "higher is better" and "lower is better" specs.
- [ ] A saved comparison reopens with the same products.
- [ ] Cross-category compare shows the explanatory message.

## 9. Tests
- Backend: matrix building and winner logic (unit tests), validation rules, authorisation on saved comparisons.
- Frontend: tray limits, differences-only toggle.

## 10. Out of scope
Comparing more than 4 products, exporting to PDF.
