# Feature: AI Shopping Assistant (incl. budget-based search)

**Phase / steps:** P5 (S1 to S3, S6 to S9), P6 (S1, S2) · **Depends on:** Catalog, Groq client, daily limit · **Status:** Not started
Design reference: `ai-integration.md`.

## 1. Purpose
Let users describe what they need and their budget in plain language and get a short list of real products with reasons.

## 2. User stories
- As a shopper, I want to type "laptop for video editing under 90,000" and get 3 good options with reasons.
- As a shopper, I want to set a maximum budget and see only products I can afford.
- As a shopper, if nothing fits my budget, I want close alternatives and an honest explanation.
- As a customer, I want my conversations saved.

## 3. Functional requirements
1. Must: user sends a message (≤ 500 chars) with optional `category` and `budget_max`.
2. Must: backend fetches matching published products from PostgreSQL (budget and category as SQL filters; keyword search if no category), top ~12.
3. Must: prompt contains the user message and only those products; Groq is asked for JSON `{message, recommendations[{product_id, reason, tradeoffs[]}]}`.
4. Must: every recommended `product_id` is checked against the list that was sent; invalid ones are dropped.
5. Must: product details on screen come from the DB, not AI text.
6. Must: if no products fit, return up to 3 "alternatives" (up to 15% over budget) clearly labelled.
7. Must: daily limit per user; remaining count shown.
8. Must: friendly fallback (matching products without AI text) when Groq fails.
9. Must: conversations and messages saved for logged-in users.
10. Should: use saved preferences (budget, favourite categories) as defaults (P6-S2).
11. Should: "Compare these" action on recommended products.

## 4. UI
- Home hero input with example prompts that opens the assistant; `/assistant` page with conversation list (desktop) and thread.
- Controls: category select, budget input/slider next to the message box.
- Recommendations appear as `VerdictPanel`/product cards with reason and trade-offs.
- States: loading ("Finding products…"), fallback notice, quota reached, error with retry, empty conversation with 3 example prompts.

## 5. API & data
`POST /assistant/conversations`, `GET /assistant/conversations[/{id}]`, `POST …/{id}/messages`, `DELETE …/{id}`, `GET /assistant/quota` · tables `ai_conversations`, `ai_messages`, `ai_usage_logs`.

## 6. Validation & rules
- Message 2 to 500 chars; `budget_max` positive number; `category` must exist.
- Assistant rate limit 10/min per user plus the daily quota stored as a Redis counter (guests have a smaller quota).
- Never send user email or personal data to Groq. API key is backend only.
- Off-topic requests get a polite "I can only help with shopping decisions" (prompt instruction; no extra logic needed).

## 7. Edge cases
- No products match (empty candidate list): do not call Groq, return a helpful message with suggested filters.
- Groq returns invalid JSON, or recommends an id that was not sent.
- Budget lower than every product.
- Quota exhausted mid-conversation.

## 8. Acceptance criteria
- [ ] Every recommended product exists in the DB and is within the budget (or labelled as an alternative).
- [ ] With Groq faked to fail, the user still sees matching products and a clear notice.
- [ ] The 31st request of the day by a customer returns `ai_quota_exceeded` and the UI explains it.
- [ ] A recommended id that was not in the sent list is never shown.
- [ ] Conversation history reopens correctly.

## 9. Tests
- Backend (fake Groq): valid reply, invalid JSON, unknown id, timeout, over-budget filtering, quota, no-candidates path.
- Frontend: loading/fallback/quota states render correctly.

## 10. Out of scope
Voice input, image input, streaming replies, long-term memory beyond saved preferences.
