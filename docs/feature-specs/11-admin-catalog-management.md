# Feature: Admin Catalog Management

**Phase / steps:** P7 (P7-S2 to P7-S6) · **Depends on:** Auth (admin role), catalog, audit log · **Status:** Not started

## 1. Purpose
Let admins manage categories, spec definitions, brands, products and images without touching the database.

## 2. User stories
- As an admin, I want to add a product with specs and images.
- As an admin, I want to define which specs a category has so filters and comparisons work.
- As an admin, I want to unpublish a product without deleting it.

## 3. Functional requirements
1. Must: admin layout (sidebar, dense tables) and dashboard with KPI tiles (products, users, pending reviews, AI calls today).
2. Must: CRUD for categories, brands, and spec definitions (key, label, unit, type, filterable, comparable, higher_is_better).
3. Must: CRUD for products with category, brand, price, availability, store URL, description, published flag, and values for the category's specs.
4. Must: image upload (validate type/size), set primary, reorder, delete.
5. Must: changing a price adds a `price_history` row and recalculates the Value Score.
6. Must: soft delete for products; categories/brands with products cannot be deleted.
7. Must: every write is recorded in the audit log.
8. Should: search and filter within admin tables; bulk publish/unpublish.

## 4. UI
Tables with search, filters, pagination; forms with React Hook Form + Zod; confirm dialogs for destructive actions; toasts that reuse the action name ("Product saved").
States: loading, empty ("No products yet. Add the first one."), validation errors, upload progress/failure.

## 5. API & data
`/admin/categories`, `/admin/categories/{id}/specs`, `/admin/brands`, `/admin/products`, `/admin/products/{id}/images` · tables listed in `database-schema.md`.

## 6. Validation & rules
- Admin-only (middleware + policies). Slugs auto-generated, unique.
- Images: jpg/png/webp, ≤ 5 MB, generated filenames, alt text required.
- Price > 0. Spec values must match the definition's `data_type`.

## 7. Edge cases
- Deleting a spec definition that has values (confirm; cascade).
- Uploading a wrong file type or an oversized file.
- Two admins editing the same product (last write wins is acceptable; show updated_at).

## 8. Acceptance criteria
- [ ] A customer gets 403 on every admin endpoint.
- [ ] A new product with specs and images appears on the public catalog immediately when published.
- [ ] Price change creates a history point and updates the Value Score.
- [ ] Each admin write creates an audit log entry.

## 9. Tests
- Backend: CRUD + authorisation + validation for each resource, image rules, price history side effect.
- Frontend: product form validation.

## 10. Out of scope
CSV bulk import, multi-admin permissions beyond a single `admin` role.
