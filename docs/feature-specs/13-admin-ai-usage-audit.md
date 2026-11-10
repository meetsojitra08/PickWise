# Feature: Admin AI Usage & Audit Log

**Phase / steps:** P7 (P7-S1, P7-S9, P7-S10) · **Depends on:** Admin layout, AI features · **Status:** Not started

## 1. Purpose
Give admins visibility into AI usage and a trustworthy record of administrative actions.

## 2. User stories
- As an admin, I want to see how much the AI is used and how often it fails.
- As an admin, I want to see who changed what and when.

## 3. Functional requirements
1. Must: `AuditLogger` service records admin writes (`action`, subject, before/after changes, IP, time). The table is append-only: no update or delete endpoints.
2. Must: audit log page with filters (admin, action, date range) and pagination.
3. Must: AI usage page: calls per day, by feature (assistant, compare, review summary), success vs error counts, average response time.
4. Must: top users by AI usage (to spot abuse).
5. Should: chart of daily AI calls (Recharts via shadcn chart).

## 4. UI
Admin pages with filter bar, table, and one chart for AI usage. Empty states for new installs.

## 5. API & data
`GET /admin/activity-logs`, `GET /admin/ai/usage` · tables `admin_activity_logs`, `ai_usage_logs`.

## 6. Validation & rules
- Admin-only. Do not store passwords, tokens or full prompts in the audit `changes` payload.
- Date range max 90 days per query; paginated.

## 7. Edge cases
- Large number of rows (index `(feature, created_at)` and use pagination).
- Time zones: store UTC, display in the admin's local time.

## 8. Acceptance criteria
- [ ] Creating/updating/deleting a product creates an audit entry with a before/after diff.
- [ ] No endpoint can edit or delete audit entries.
- [ ] AI usage page numbers match `ai_usage_logs` rows in a test.

## 9. Tests
- Backend: logger writes, filters, authorisation, aggregation queries.
- Frontend: filters and chart rendering with sample data.

## 10. Out of scope
Exporting logs, real-time alerts.
