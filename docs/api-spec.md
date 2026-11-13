# API Specification (v1)

Base path: `/api/v1`. JSON only. Cookie (Sanctum) auth.

## Conventions

**Success (single)**
```json
{ "data": { "id": 1, "name": "..." } }
```

**Success (collection)**
```json
{ "data": [ ... ], "meta": { "current_page": 1, "per_page": 24, "total": 120, "last_page": 5 }, "links": { "next": "..." } }
```

**Error**
```json
{ "error": { "code": "validation_failed", "message": "Human readable message", "details": { "email": ["The email has already been taken."] }, "request_id": "..." } }
```

| HTTP | `error.code` examples |
|------|-----------------------|
| 401 | `unauthenticated` |
| 403 | `forbidden` |
| 404 | `not_found` |
| 422 | `validation_failed` |
| 429 | `rate_limited`, `ai_quota_exceeded` |
| 503 | `ai_unavailable` |

- Money is returned as `{ "amount": "89999.00", "currency": "INR" }`.
- Timestamps are ISO-8601 UTC.
- Every list endpoint is paginated.
- Public and customer routes only ever expose `is_published = true` products and `approved` reviews.

## Auth
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | guest | Create account |
| POST | `/auth/login` | guest | Start session |
| POST | `/auth/logout` | user | End session |
| GET | `/auth/me` | user | Current user + role |
| PATCH | `/account/profile` | user | Name, email |
| PUT | `/account/password` | user | Change password |
| PUT | `/account/preferences` | user | Budget, categories, priorities |

## Catalog (public)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/categories` | Category tree |
| GET | `/categories/{slug}/filters` | Filter facets (price range, brands, filterable specs) |
| GET | `/products` | Search, filter, sort, paginate |
| GET | `/products/{slug}` | Detail incl. images, specs, summary, value score |
| GET | `/products/{slug}/reviews` | Approved reviews, paginated |
| GET | `/products/{slug}/price-history` | Series for chart |
| GET | `/products/{slug}/similar` | Similar products (same category, close specs/price) |

`GET /products` query params: `q`, `category`, `brand[]`, `price_min`, `price_max`, `rating_min`, `availability`, `spec[key]=value|min:max`, `sort` (`relevance`, `price_asc`, `price_desc`, `rating`, `value`, `newest`), `page`, `per_page` (max 48).

Price history returns `{ "data": { "currency": "INR", "points": [{ "recorded_at": "2026-07-01", "price": { "amount": "89999.00", "currency": "INR" } }] } }` in chronological order. An empty `points` array means no prices have been recorded.

## Customer
| Method | Path | Purpose |
|--------|------|---------|
| GET / POST / DELETE | `/wishlist`, `/wishlist/{productId}` | List, add, remove |
| POST | `/products/{slug}/reviews` | Create review (`pending`) |
| PATCH / DELETE | `/reviews/{id}` | Edit or delete own review |
| GET / POST | `/comparisons` | List or save a comparison |
| GET / PATCH / DELETE | `/comparisons/{id}` | Read, rename or change items, delete |
| POST / DELETE | `/comparisons/{id}/share` | Create or return the share link token / stop sharing |
| GET (public) | `/shared/comparisons/{token}` | Read-only view of a shared comparison |

## Compare (public)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/compare` | Public, no AI (no daily limit); body `{ product_ids: [2..4] }` returns spec matrix with per-row winner |
| POST | `/compare/verdict` | Public, daily AI limit applied; AI explanation of strengths, weaknesses and verdict |

**Compare matrix shape**
```json
{
  "data": {
    "category": { "id": 5, "name": "Laptops", "slug": "laptops" },
    "products": [
      { "id": 14, "name": "Lenovo Yoga Slim 7 Pro", "price": { "amount": "84999.00", "currency": "INR" } },
      { "id": 22, "name": "Apple MacBook Air 13 M3", "price": { "amount": "89900.00", "currency": "INR" } }
    ],
    "rows": [
      {
        "key": "ram_gb",
        "label": "RAM",
        "unit": "GB",
        "data_type": "number",
        "higher_is_better": true,
        "winner_product_id": 22,
        "values": [
          { "product_id": 14, "value": 16 },
          { "product_id": 22, "value": 32 }
        ]
      }
    ]
  }
}
```
- `products` are compact product summaries in the requested order.
- `rows` contain only `is_comparable` specs with at least one value; `value` is `null` when a product does not list the spec.
- `winner_product_id` is `null` for ties, missing direction, and text specs.
- Comparing products from different categories returns `422 validation_failed` with `error.details.product_ids`.

## Assistant
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/assistant/conversations` | List own conversations |
| POST | `/assistant/conversations` | Start conversation |
| GET | `/assistant/conversations/{id}` | Messages |
| POST | `/assistant/conversations/{id}/messages` | Body `{ message, category?, budget_max? }`; returns reply with recommendations |
| DELETE | `/assistant/conversations/{id}` | Delete |
| GET | `/assistant/quota` | Remaining AI uses today |

**Assistant reply shape**
```json
{
  "data": {
    "id": 91,
    "role": "assistant",
    "content": "Here are three laptops under ₹90,000 that suit video editing.",
    "recommendations": [
      { "product_id": 14, "reason": "...", "tradeoffs": ["..."] }
    ],
    "alternatives": [ { "product_id": 22, "reason": "Slightly over budget but ..." } ],
    "status": "ok"
  }
}
```

## Admin (`role:admin`, prefix `/admin`)
| Resource | Endpoints |
|----------|-----------|
| Dashboard | `GET /admin/dashboard` (counts, recent activity, AI usage summary) |
| Categories | CRUD `/admin/categories` |
| Spec definitions | CRUD `/admin/categories/{id}/specs` |
| Brands | CRUD `/admin/brands` |
| Products | CRUD `/admin/products`, `POST /admin/products/{id}/images`, `PATCH .../images/reorder`, `DELETE .../images/{imageId}` |
| Users | `GET /admin/users`, `PATCH /admin/users/{id}` (activate/deactivate, role) |
| Reviews | `GET /admin/reviews?status=`, `PATCH /admin/reviews/{id}` (approve/reject), `DELETE` |
| AI usage | `GET /admin/ai/usage` (by day, feature, status, tokens, latency) |
| Audit log | `GET /admin/activity-logs` (filter by admin, action, date) |
| Summaries | `POST /admin/products/{id}/regenerate-summary` |

Every admin write goes through `AuditLogger`.

## Rate limits (defaults)
| Scope | Limit |
|-------|-------|
| Login | 5 / minute per IP + email |
| Register | 5 / hour per IP |
| Public API | 120 / minute per IP |
| Assistant, verdict | 10 / minute per user + daily quota |
| Review create | 5 / hour per user |
