# Feature: AI Compare Verdict

**Phase / steps:** P5 (P5-S10, P5-S11) · **Depends on:** Product comparison, Groq client · **Status:** Not started

## 1. Purpose
Explain, in plain language, the strengths and weaknesses of the products being compared and which suits whom.

## 2. User stories
- As a shopper, I want to know which product is best for my needs without reading every spec.

## 3. Functional requirements
1. Must: `POST /compare/verdict` takes 2 to 4 product ids (same validation as compare).
2. Must: backend loads product data and specs from the DB and sends them to Groq; asks for JSON `{verdict, products[{product_id, strengths[], weaknesses[]}]}`.
3. Must: reject ids in the reply that were not sent.
4. Must: counts against the daily AI limit; shows remaining uses.
5. Must: graceful failure: the spec matrix still works without the verdict.
6. Should: store the verdict on a saved comparison (`ai_verdict`) so reopening doesn't call Groq again.
7. Should: optional "My priority" field (price, performance, battery…) sent in the prompt.

## 4. UI
`VerdictPanel` above the compare matrix with a "Get AI verdict" button (user-triggered, not automatic, to protect the quota).
States: idle, loading, ready, error with retry, quota reached.

## 5. API & data
`POST /compare/verdict` · `comparisons.ai_verdict` · `ai_usage_logs`.

## 6. Validation & rules
- Same product-set rules as comparison (2 to 4, same category, published).
- Strengths/weaknesses: max 4 each, short strings. Verdict max ~60 words.

## 7. Edge cases
- Products changed since the saved verdict (acceptable: show a "Regenerate" option).
- Groq failure or invalid JSON.
- Guest users with a small quota.

## 8. Acceptance criteria
- [ ] Verdict only mentions products that were compared.
- [ ] A Groq failure leaves the compare page fully usable.
- [ ] Quota decreases by one per generated verdict.

## 9. Tests
- Backend (fake Groq): valid reply, invalid JSON, unknown id, quota.
- Frontend: panel states.

## 10. Out of scope
Automatic verdicts, multiple verdict styles.
