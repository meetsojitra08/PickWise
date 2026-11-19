# Screenshots

This folder holds annotated screenshots used in the main README.

| File | Screen | Mode |
|------|--------|------|
| `01-home-hero.png` | Home page hero with AI assistant bar | Light |
| `02-catalog.png` | Catalog page with FilterPanel and product grid | Light |
| `03-product-detail.png` | Product detail — gallery, specs, AI review summary | Light |
| `04-compare-matrix.png` | Side-by-side comparison with AI verdict panel | Light |
| `05-assistant.png` | AI shopping assistant with grounded recommendation cards | Dark |
| `06-admin-dashboard.png` | Admin dashboard — KPI tiles and audit log | Light |
| `07-mobile-catalog.png` | Catalog page at 390 px mobile width | Light |

Screenshots are taken at 1440 × 900 desktop (and 390 × 844 for mobile) with the
Docker stack running (`docker compose up -d`) and the demo seed loaded
(`docker compose exec app php artisan migrate:fresh --seed`).
