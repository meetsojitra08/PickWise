# Feature: Admin Users & Review Moderation

**Phase / steps:** P7 (P7-S7, P7-S8) · **Depends on:** Auth, reviews, review summary · **Status:** Not started

## 1. Purpose
Let admins manage registered customers and keep reviews trustworthy.

## 2. User stories
- As an admin, I want to see users and deactivate abusive ones.
- As an admin, I want a queue of pending reviews to approve or reject quickly.

## 3. Functional requirements
1. Must: users table with search, role, active status, join date, review count.
2. Must: activate/deactivate a user; an admin cannot deactivate or demote themselves.
3. Must: optionally change a user's role (customer ↔ admin) with confirmation.
4. Must: review moderation queue (default filter `pending`) showing product, rating, text, author.
5. Must: approve, reject (with optional reason), or delete a review.
6. Must: moderation updates rating aggregates and triggers the review summary job.
7. Must: all actions logged in the audit log with who, what, when.
8. Should: bulk approve/reject.

## 4. UI
Two admin pages (Users, Reviews) with filter tabs (Pending · Approved · Rejected), row actions, confirm dialogs. Empty queue: "No reviews waiting for approval."

## 5. API & data
`GET /admin/users`, `PATCH /admin/users/{id}`, `GET /admin/reviews?status=`, `PATCH /admin/reviews/{id}`, `DELETE /admin/reviews/{id}` · tables `users`, `reviews`, `admin_activity_logs`.

## 6. Validation & rules
- Admin-only. Cannot remove the last active admin.
- Moderation sets `moderated_by` and `moderated_at`.

## 7. Edge cases
- Moderating a review for an unpublished product.
- Two admins moderating the same review at once (second sees updated status).
- Deactivated user's existing reviews: keep (decision: they remain unless deleted).

## 8. Acceptance criteria
- [ ] A deactivated user is logged out on their next request and cannot log in.
- [ ] Approving a review changes the product's rating and queues the summary job.
- [ ] An admin cannot deactivate their own account.
- [ ] Each action appears in the audit log.

## 9. Tests
- Backend: authorisation, self-protection rules, moderation side effects, audit entries.
- Frontend: queue filters and actions.

## 10. Out of scope
Automated spam detection, user messaging.
