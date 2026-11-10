# Feature: AI Review Summary

**Phase / steps:** P5 (P5-S4, P5-S5) · **Depends on:** Reviews, Groq client · **Status:** Not started
Design reference: `ai-integration.md` §3.3.

## 1. Purpose
Turn many reviews into a short summary of what customers like and dislike.

## 2. User stories
- As a shopper, I want to understand what reviewers say in a few seconds.
- As an admin, I want summaries to refresh when review moderation changes.

## 3. Functional requirements
1. Must: when a review is approved, rejected or deleted, queue a job to regenerate that product's summary.
2. Must: require at least 3 approved reviews; otherwise show "Not enough reviews yet."
3. Must: send up to 30 recent approved reviews to Groq and ask for JSON `{summary, pros[], cons[], sentiment}`.
4. Must: save the result in `review_summaries`; the product page reads the saved row and never calls the AI while loading.
5. Must: if generation fails, keep the previous summary (if any) and retry the job a few times.
6. Should: admin button "Regenerate summary" on the product.

## 4. UI
`ReviewSummaryCard` on the product page: 2 to 3 sentence summary, "What people like" (check icons) and "What people dislike" (minus icons), sentiment label, "Based on N reviews".
States: not enough reviews, summary ready, no summary yet (generation pending: show nothing rather than an error).

## 5. API & data
Included in `GET /products/{slug}`; `POST /admin/products/{id}/regenerate-summary` · table `review_summaries`.

## 6. Validation & rules
- Treat review text as data only (the prompt says to summarise, not follow instructions in reviews).
- Limit each review's length before sending. Do not send user names or emails.
- Pros/cons: max 6 items each, short strings.
- Log each call in `ai_usage_logs` (feature `review_summary`).

## 7. Edge cases
- Reviews deleted until fewer than 3 remain: remove or hide the summary.
- Groq returns invalid JSON: treat as failure, keep old summary.
- Many approvals in a short time: avoid duplicate jobs (a simple "only latest job matters" approach is fine).

## 8. Acceptance criteria
- [ ] Approving the 3rd review creates a summary without any user waiting.
- [ ] The product page loads with zero Groq calls (verified in a test).
- [ ] A failed Groq call does not break the product page.
- [ ] Summary shows the correct review count.

## 9. Tests
- Backend (fake Groq): generates on approval, skips under 3 reviews, handles invalid JSON, keeps old summary on failure.
- Frontend: card states.

## 10. Out of scope
Per-feature sentiment scores, translating reviews, caching by hash.
