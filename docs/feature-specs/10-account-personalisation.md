# Feature: Account & Personalisation

**Phase / steps:** P1 (P1-S7), P4 (P4-S6), P6 (P6-S2, P6-S3) · **Depends on:** Auth, wishlist, comparison, assistant · **Status:** Not started

## 1. Purpose
Give customers one place to manage their profile, saved items and preferences, and let simple preferences improve AI suggestions.

## 2. User stories
- As a customer, I want to update my name, email and password.
- As a customer, I want to see my wishlist, saved comparisons and past AI conversations.
- As a customer, I want to set a default budget and favourite categories so the assistant starts with them.

## 3. Functional requirements
1. Must: profile update (name, email) and password change (requires current password).
2. Must: preferences saved in `users.preferences` (default budget, favourite categories, priorities such as "price", "battery").
3. Must: account tabs: Wishlist · Saved comparisons · Conversations · Preferences · Profile.
4. Must: preferences are added to the assistant prompt as context; the user can see and clear them.
5. Must: delete a conversation or a saved comparison.
6. Should: "Delete my account" with confirmation (removes personal data).

## 4. UI
Tabbed account page. Preferences form with budget input and category chips. Empty states per tab with a single clear action.

## 5. API & data
`PATCH /account/profile`, `PUT /account/password`, `PUT /account/preferences`, plus wishlist, comparisons and conversations endpoints · `users.preferences` (jsonb).

## 6. Validation & rules
- New email must be unique. Password ≥ 8 chars, confirmed, and different from the current one.
- Preferences schema validated (budget ≥ 0, categories exist, ≤ 5 priorities).
- Never include name or email in AI prompts; only preference values.

## 7. Edge cases
- Changing email to one already in use.
- Preferences reference a category later removed (ignore it gracefully).

## 8. Acceptance criteria
- [ ] Wrong current password blocks a password change with a clear message.
- [ ] Saved preferences visibly pre-fill the assistant's budget/category.
- [ ] Deleting a conversation removes its messages.

## 9. Tests
- Backend: profile/password/preferences validation and authorisation.
- Frontend: tab navigation, preference form.

## 10. Out of scope
Notification settings, avatars/uploads, order history.
