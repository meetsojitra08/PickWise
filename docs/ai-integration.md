# AI Integration (Groq): Simple Version

We use the AI in a **basic, easy-to-explain way**: our backend sends a prompt to the Groq API and shows the reply. No training, no embeddings, no vector database.

> **One rule to remember:** the AI only sees products from our own database, and the product details shown to users always come from our database, not from the AI's text. That stops the AI from inventing products.

## 1. How it works in one picture

```
React app ──► Laravel API ──► (1) get real products from PostgreSQL
                              (2) build a prompt with those products
                              (3) call Groq API
                              (4) check the reply
                         ◄── (5) return JSON to React
```

## 2. Groq client

- One class: `App\AI\GroqClient`. It is the **only** place that talks to Groq.
- Uses Laravel's `Http` facade to call Groq's chat completions endpoint (Groq is OpenAI-compatible).
- Settings come from `config/ai.php`: `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, timeout.
- **Check the Groq docs for the current model name and how to request JSON replies.** Do not hard-code the model name.
- Set a timeout (about 20 seconds). If Groq fails, throw a clear exception (see §6).
- The API key lives only in the backend `.env`. The React app never sees it.

## 3. The three AI features

All three follow the same pattern: **get data from DB → build prompt → call Groq → check reply → return**.

### 3.1 Shopping assistant (including budget search)
- **Input from the user:** a message, plus optional `category` and `budget_max` (chosen with simple UI controls, so we do not need AI to guess them).
- **Backend steps:**
  1. Find matching products from the DB: published, in the category, `price <= budget_max`. If no category is chosen, use the existing keyword search on the message. Take the top 10 to 12.
  2. Build a prompt: "Here is the user request and a list of products (id, name, price, key specs, rating). Pick the best 3 and explain why. Reply in JSON only."
  3. Call Groq.
  4. Parse the JSON and **check each recommended `product_id` exists in the list we sent** (and is within budget).
  5. Save the messages and return the recommendations.
- **If nothing matches the budget:** return the cheapest close matches as "alternatives" (for example, up to 15% over budget) and say so.

**Example reply from Groq (JSON):**
```json
{
  "message": "Here are three laptops that suit video editing.",
  "recommendations": [
    { "product_id": 14, "reason": "32GB RAM and a colour-accurate display.", "tradeoffs": ["Fans get loud"] }
  ]
}
```

### 3.2 Compare explanation
- **Input:** 2 to 4 product ids selected by the user.
- **Backend:** load those products and specs from the DB, send them to Groq, and ask for the strengths and weaknesses of each product and a short verdict.
- **Reply (JSON):** `{ "verdict": "...", "products": [{ "product_id": 1, "strengths": [], "weaknesses": [] }] }`.

### 3.3 Review summary
- **When:** after a review is approved (a queued job), generate and **save** the summary in `review_summaries`.
- **Input:** up to 30 recent approved reviews. Needs at least 3 reviews, otherwise show "Not enough reviews yet".
- **Reply (JSON):** `{ "summary": "...", "pros": ["..."], "cons": ["..."], "sentiment": "positive|mixed|negative" }`.
- Product pages read the saved summary. They **never** call the AI while loading.

## 4. Safety checks (simple and necessary)

| Risk | What we do |
|------|-----------|
| AI invents a product | Only send DB products; reject any `product_id` we did not send; display data from the DB |
| AI ignores the budget | Filter by budget in SQL before the AI sees anything; double-check the price in code |
| Broken or non-JSON reply | Wrap parsing in try/catch; if it fails, use the fallback (§6) |
| Leaked API key | Backend `.env` only, never returned or logged |
| Too long input | Limit the user message to 500 characters |
| Review text trying to trick the AI | In the prompt, tell the AI that review text is just data to summarise, not instructions |
| Personal data | Do not send emails or user details to Groq |

## 5. Daily limit per user (protects the free quota)

- Table `ai_usage_logs` records every AI call (user, feature, status, time) for admin analytics.
- A Redis counter (`ai:quota:{user_or_session}:{date}`, expires at midnight) counts today's successful calls. It is fast, and if Redis is cleared the counter simply restarts.
- A middleware checks the counter before calling Groq. Customers get 30/day and guests get 5/day (set in `config/ai.php`). Customers are counted by user id; guests by session key (IP address if there is no session). This applies to the assistant and to `POST /compare/verdict`.
- Over the limit → `429` with `ai_quota_exceeded`. The UI shows "You've used today's AI answers. Browse and filter products in the meantime."
- `GET /assistant/quota` returns how many are left, for a small counter in the UI.

## 6. Errors and fallback

| Situation | Behaviour |
|-----------|-----------|
| Groq timeout or server error | Retry once, then return `503 ai_unavailable` |
| Invalid JSON reply | Treat as failure, same as above |
| Failure in the assistant | Show the matching products from step 1 anyway, with a note: "AI is unavailable. Here are the best matches from the catalog." |
| Failure in review summary job | Job retries a few times; the page shows no summary instead of an error |

The user should never see a crash or a technical message.

## 7. Testing

- Create a `FakeGroqClient` that returns a prepared reply. Tests never call the real Groq API.
- Test cases: valid reply, invalid JSON, a `product_id` that was not sent (must be rejected), timeout, daily limit reached.
- Test the SQL filter: products above budget must never be sent to the AI.

## 8. What the frontend does

- Renders recommendations from the JSON fields (`product_id`, `reason`, `tradeoffs`), loading the product card data from the catalog API.
- Shows a loading state while waiting, an error state with retry, the fallback notice, and the remaining-uses counter.
- See `ui-context.md` for the Verdict panel design.

## 9. How to explain this in an interview

> "I integrated the Groq API from my Laravel backend. For the assistant, I first query PostgreSQL for real products that match the user's budget and category, then send only those to the model and ask it to pick and explain the best ones in JSON. I validate the reply so it can only recommend products that exist, and I show product data from my database. I also added a daily limit per user, error handling with a fallback, and the API key stays on the server."

Each part of that sentence maps to a small piece of code you wrote, so you can explain every line.
