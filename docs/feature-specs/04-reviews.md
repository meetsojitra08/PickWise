# Feature: Reviews

**Phase / steps:** P3 (P3-S1 to P3-S4) · **Depends on:** Auth, product detail · **Status:** Not started

## 1. Purpose
Let customers share experiences and let everyone read them. Reviews feed the rating average and the AI summary.

## 2. User stories
- As a shopper, I want to read ratings and reviews before deciding.
- As a customer, I want to write, edit and delete my own review.
- As an admin, I want to approve or reject reviews (see feature 12).

## 3. Functional requirements
1. Must: list approved reviews per product, paginated, newest first, with a rating distribution (5 to 1 stars).
2. Must: logged-in customers can create one review per product (rating 1 to 5, title, body). It starts as `pending`.
3. Must: customers can edit or delete their own review. Editing sends it back to `pending`.
4. Must: `rating_avg` and `rating_count` on the product update only from approved reviews.
5. Should: sort reviews (newest, highest, lowest).
6. Should: show the customer's own pending review to them with a "Awaiting approval" label.

## 4. UI
- `ReviewList` with distribution bars, `ReviewForm` (star input, title, body, character counter).
- States: no reviews ("No reviews yet. Be the first to share your experience."), pending notice, submit success toast "Review submitted", validation errors inline, login prompt for guests.

## 5. API & data
`GET /products/{slug}/reviews`, `POST /products/{slug}/reviews`, `PATCH/DELETE /reviews/{id}` · table `reviews`.

## 6. Validation & rules
- Rating integer 1 to 5. Title 3 to 150 chars. Body 10 to 2000 chars.
- One review per user per product (DB unique + validation message).
- Review creation limited to 5/hour per user.
- Only the author can edit/delete (policy). Output is escaped; never render as HTML.

## 7. Edge cases
- User tries to review the same product twice.
- Product is unpublished after a review is written.
- Deleting an approved review updates the averages.
- Seeded reviews have no `user_id`.

## 8. Acceptance criteria
- [ ] A second review by the same user on the same product is rejected with a clear message.
- [ ] A pending review is not visible to other users and does not change the average.
- [ ] Approving a review updates `rating_avg` and `rating_count`.
- [ ] A user cannot edit another user's review (403).

## 9. Tests
- Backend: create/validation/duplicate, policy checks, aggregate recalculation, throttle.
- Frontend: form validation, distribution rendering.

## 10. Out of scope
Photos in reviews, "helpful" votes, verified-purchase badges.
