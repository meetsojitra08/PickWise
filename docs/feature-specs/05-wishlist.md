# Feature: Wishlist

**Phase / steps:** P4 (P4-S1, P4-S2) · **Depends on:** Auth, catalog · **Status:** Not started

## 1. Purpose
Let customers save products to revisit later.

## 2. User stories
- As a customer, I want to heart a product to save it.
- As a customer, I want to see and manage my saved products in one place.

## 3. Functional requirements
1. Must: add/remove a product with one click from cards and the detail page (optimistic UI with rollback on error).
2. Must: wishlist page lists saved products, newest first, with price and availability.
3. Must: wishlist is private to the user.
4. Should: guests who click the heart are asked to log in, then the item is added after login.
5. Should: show a price-drop indicator if the price fell since it was saved.

## 4. UI
Heart toggle on `ProductCard` and the detail page; Account → Wishlist tab.
States: empty ("Your wishlist is empty. Heart a product to keep it here."), loading, error with retry.

## 5. API & data
`GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/{productId}` · table `wishlist_items`.

## 6. Validation & rules
- Unique `(user_id, product_id)`; adding twice is idempotent (no error).
- Only published products can be added; unpublished ones disappear from the list.

## 7. Edge cases
- Product removed by admin while on someone's wishlist.
- Rapid double-click on the heart.
- Offline or failed request → rollback and toast "Couldn't update your wishlist. Try again."

## 8. Acceptance criteria
- [ ] Heart state is correct after reload on cards and detail page.
- [ ] Removing from the Wishlist tab updates other open views.
- [ ] User A can never see or change user B's wishlist.

## 9. Tests
- Backend: add (idempotent), remove, list, authorisation.
- Frontend: optimistic toggle and rollback.

## 10. Out of scope
Multiple named lists, sharing wishlists, price alerts by email.
