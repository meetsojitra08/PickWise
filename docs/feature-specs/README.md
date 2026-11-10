# Feature Specs

One file per feature. A spec answers: **what must this feature do, for whom, and how do we know it is done?** Read the matching spec **before** starting any step of that feature (see `ai-workflow-rules.md`).

| # | Spec | Phase | Tracker steps |
|---|------|-------|---------------|
| 01 | [Authentication & accounts](./01-auth-accounts.md) | P1 | P1-S1 to P1-S6 |
| 02 | [Catalog search & filters](./02-catalog-search-filter.md) | P2 | P2-S1 to P2-S7, S9, S10, S12 |
| 03 | [Product detail](./03-product-detail.md) | P2 | P2-S8, S11, S13 to S15 |
| 04 | [Reviews](./04-reviews.md) | P3 | P3-S1 to P3-S4 |
| 05 | [Wishlist](./05-wishlist.md) | P4 | P4-S1, P4-S2 |
| 06 | [Product comparison](./06-product-comparison.md) | P4 | P4-S3 to P4-S6 |
| 07 | [AI shopping assistant](./07-ai-shopping-assistant.md) | P5, P6 | P5-S1 to S3, S6 to S9, P6-S1, S2 |
| 08 | [AI review summary](./08-ai-review-summary.md) | P5 | P5-S4, P5-S5 |
| 09 | [AI compare verdict](./09-ai-compare-verdict.md) | P5 | P5-S10, P5-S11 |
| 10 | [Account & personalisation](./10-account-personalisation.md) | P1, P6 | P1-S7, P6-S2, P6-S3 |
| 11 | [Admin: catalog management](./11-admin-catalog-management.md) | P7 | P7-S2 to P7-S6 |
| 12 | [Admin: users & review moderation](./12-admin-users-moderation.md) | P7 | P7-S7, P7-S8 |
| 13 | [Admin: AI usage & audit log](./13-admin-ai-usage-audit.md) | P7 | P7-S1, P7-S9, P7-S10 |

Use [`_template.md`](./_template.md) for any new feature.

**Conventions:** "Must" = required for done. "Should" = nice to have if time allows. Endpoints and tables are defined in `api-spec.md` and `database-schema.md`; specs only reference them. If a spec and those files disagree, stop and ask.
