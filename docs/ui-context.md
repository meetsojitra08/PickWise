# UI Context: Design System & Experience

The bar: a product that looks like it was shipped by a top-tier product design team. That comes from **restraint, hierarchy, consistency and craft**, not from piling on effects.

## 1. Design intent

**Subject:** a decision tool for people who feel overwhelmed by choice.
**Feeling:** calm, clear, confident. The interface is a knowledgeable friend who has done the homework.
**Primary job of every screen:** make the next decision easier.

**The memorable element (spend the boldness here, keep everything else quiet): the "Verdict" panel.**
Wherever AI gives guidance (assistant picks, compare result, review summary) it appears in one consistent, distinctive component: a structured decision card with a fit meter, "why it fits", and honest trade-offs. Everything else (grids, filters, forms) stays disciplined and neutral so the Verdict stands out.

### Things we deliberately avoid
- A cream background with a terracotta accent and a serif headline.
- A near-black background with a neon accent.
- Identical rounded cards with the same shadow everywhere.
- A tracked-out ALL-CAPS label above every heading.
- Gradient washes as decoration, glassmorphism everywhere, purple "AI sparkle" styling.
- A fade-and-slide animation on every section.
- A sparkles icon on every AI element. Use one consistent, small mark for AI content.

## 2. Design tokens

Implement as CSS variables in `styles/globals.css`, mapped into Tailwind (through `tailwind.config` or the CSS `@theme` block, depending on the Tailwind version installed; check the current Tailwind and shadcn/ui docs at P0-S7) and the shadcn token names (`--background`, `--foreground`, `--primary`, ...). **Never hard-code hex values in components.**

### Colour (light)
| Token | Name | Hex | Use |
|-------|------|-----|-----|
| `--background` | Paper | `#F6F7F5` | App background |
| `--card` | Surface | `#FFFFFF` | Cards, popovers |
| `--foreground` | Ink | `#17212B` | Primary text |
| `--muted-foreground` | Slate | `#5B6773` | Secondary text |
| `--border` | Line | `#E2E6E3` | Borders, dividers |
| `--primary` | Deep Teal | `#0F5E5A` | Primary actions, links, focus ring |
| `--primary-foreground` | | `#FFFFFF` | Text on primary |
| `--accent` | Marigold | `#F2B134` | Verdict highlights, value score, key emphasis (use sparingly) |
| `--positive` | Moss | `#2E7D4F` | Pros, in stock, price drop |
| `--negative` | Brick | `#C0482F` | Cons, errors, out of stock |
| `--warning` | Amber | `#B7791F` | Low stock, over-budget notices |

### Colour (dark)
Build a true dark theme, not an inversion. Suggested: background `#0F1519`, surface `#161E24`, border `#26323A`, foreground `#E8EDEA`, primary lifts to `#3FB6AE`, accent `#F2B134`. Verify contrast for every pair.

Contrast: body text ≥ 4.5:1, large text and UI boundaries ≥ 3:1. Colour is never the only signal (pair with icon or text).

### Typography
| Role | Typeface | Notes |
|------|----------|-------|
| Display / headings | **Bricolage Grotesque** | Personality lives here; use optical sizing, tight tracking on large sizes |
| Body / UI | **Figtree** | Friendly, highly legible; enable tabular numerals for prices and specs |

Load via self-hosted fonts or `@fontsource` packages (no render-blocking third-party requests), with `font-display: swap` and metric-matched fallbacks.

Type scale (rem, ratio ≈ 1.2): `12 / 14 / 16 / 18 / 20 / 24 / 30 / 38 / 48`.
Body 16px / 1.6. Headings 1.1 to 1.25 line-height. Max line length 65 to 75 characters. Sentence case everywhere. Numbers in prices, specs and tables use `font-variant-numeric: tabular-nums`.

### Spacing, radius, elevation
- Spacing: 4px base grid. Section rhythm 48/64/96. Card padding 16 or 24.
- Radius is **hierarchical, not uniform**: controls `10px`, cards `16px`, large surfaces and sheets `24px`, pills and avatars `9999px`, images inside cards `12px`.
- Elevation: prefer 1px borders over shadows. Use shadow only for things that float (popovers, sticky compare tray, dialogs), one soft layered shadow.
- Layout container: max `1280px`, 12-column grid, gutters 24px (16px on mobile).

## 3. Component inventory

**shadcn/ui primitives to install:** button, input, textarea, select, checkbox, radio-group, switch, slider, tabs, dialog, sheet, drawer, dropdown-menu, popover, tooltip, command, badge, avatar, skeleton, table, pagination, form, label, separator, sonner (toasts), scroll-area, accordion, hover-card, progress, chart.

Customise tokens, radii and variants, so the result does not look like default shadcn.

**Project components (`components/shared`)**

| Component | Purpose |
|-----------|---------|
| `ProductCard` | Image, name, brand, price, rating, value score, wishlist and compare toggles |
| `PriceTag` | Currency formatting, strikethrough, drop indicator |
| `RatingStars` | Accessible rating with count |
| `ValueScore` | Small dial/bar with tooltip explaining the formula |
| `FilterPanel` | Sidebar on desktop, bottom sheet on mobile; chips for applied filters |
| `SpecTable` | Grouped specs, zebra-free, strong row hover |
| `CompareTray` | Sticky bottom tray with selected products (2 to 4), "Compare" CTA |
| `CompareMatrix` | Spec rows × products, winner highlighted per row, sticky first column |
| `VerdictPanel` | **Signature component** (see below) |
| `ReviewSummaryCard` | Pros and cons themes with mention counts |
| `ReviewList` | Rating distribution + review items |
| `PriceHistoryChart` | Line chart with min/max markers |
| `AssistantThread` | Message list, recommendation cards, loading indicator |
| `EmptyState` | Illustration-free, headline + one clear action |
| `ErrorState` | What happened + how to fix + retry |
| `QuotaMeter` | "18 AI answers left today" |

### The Verdict panel (signature)
```
┌──────────────────────────────────────────────────────┐
│ ◈ Verdict                           Fit  ▓▓▓▓▓▓▓▓░░ 87│
│ Best for video editing under ₹90,000                 │
│                                                      │
│ Why it fits                                          │
│  ✓ 32GB RAM handles 4K timelines                     │
│  ✓ Colour-accurate OLED display                      │
│ Trade-offs                                           │
│  – Fans get loud under sustained export              │
│                                                      │
│ [View product]  [Add to compare]    Based on 214 reviews│
└──────────────────────────────────────────────────────┘
```
- One consistent AI mark (`◈`-style custom icon), a left accent rule in Marigold, a subtle tinted surface (not a gradient).
- Pros use Moss with a check icon, trade-offs use Brick with a minus icon, never colour alone.
- Shows **where the answer came from** where possible ("Based on 214 reviews", "Compared on 9 specs"). Trust is the product.
- States: loading (skeleton), ready, fallback ("AI is unavailable, showing top matches"), error.

## 4. Page blueprints

### Home
Hero is **the assistant itself**: a large, focused input ("What are you shopping for, and what's your budget?") with 3 example prompts the user can tap. Below: category entry points, trending comparisons, top value picks. No stock carousel, no abstract blob art.

```
┌──────────────────────────────────────────────────────┐
│ Logo      Browse  Compare  Assistant        ⌕  ♡  👤 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Decide what to buy, with the homework done.         │
│  ┌────────────────────────────────────────────┐ [Ask]│
│  │ A laptop for video editing under ₹90,000…  │      │
│  └────────────────────────────────────────────┘      │
│  Try: "Best earbuds for running" · "4K monitor …"    │
│                                                      │
│  Categories (large, image-led tiles, asymmetric)     │
│  Top value picks (ProductCard row)                   │
└──────────────────────────────────────────────────────┘
```

### Catalog (`/products`)
Left filter panel (desktop) / sheet (mobile), applied-filter chips, sort select, result count, 3 to 4 column grid, URL-synced filters (shareable links), skeleton grid on load, pagination.

### Product detail
Gallery (left, thumbnails) · Key facts and price (right, sticky) → Verdict-style review summary → specs → price history → reviews → similar products. Mobile: sticky bottom bar with price and primary action.

### Compare
Sticky product headers, spec matrix with per-row winner, "Show only differences" toggle, Verdict panel on top, save comparison, share link. Mobile: horizontal scroll with sticky first column.

### Assistant (`/assistant`)
Two-pane on desktop (conversation list · thread), single pane on mobile. Loading indicator, recommendation cards inline, quota meter, "Compare these" action on any set of picks.

### Account
Tabs: Wishlist · Saved comparisons · Conversations · Preferences · Profile.

### Admin
Distinct, dense, utilitarian layout (sidebar nav, data tables, filters, bulk actions). Same tokens, different density. Dashboard with KPI tiles, AI usage chart, recent audit entries, pending reviews.

## 5. Interaction & motion

- Motion answers an action (toggle wishlist, add to compare tray, open sheet, expand row). **No decorative scroll animations.**
- One orchestrated moment: the reveal of an assistant answer. Nothing else animates on page load.
- Durations 120 to 220ms, ease-out for entering, ease-in for leaving. Respect `prefers-reduced-motion` (disable non-essential motion).
- Optimistic UI for wishlist and compare toggles with rollback on error.
- Skeletons match final layout to avoid layout shift. Images have fixed aspect ratios.

## 6. Content & microcopy

- Plain verbs, sentence case, active voice. Name things from the user's view ("Saved comparisons", not "Comparison entities").
- Buttons state the outcome: "Save comparison", "Add to wishlist". The same action keeps the same name through the flow (button "Save comparison" → toast "Comparison saved").
- Errors never apologise and always say what happened and how to fix it. Example: "We couldn't reach the AI assistant. Showing the top matches from the catalog instead."
- Empty states are invitations: "Your wishlist is empty. Heart a product to keep it here."
- Never expose internal terms (model names, tokens, JSON, pipeline).

## 7. Accessibility (non-negotiable)

- WCAG 2.2 AA. Full keyboard operation; visible focus ring (2px Deep Teal, 2px offset) on every interactive element.
- Semantic HTML first; ARIA only where needed. Dialogs trap focus and restore it.
- Live regions for assistant responses and toasts. Form errors linked with `aria-describedby`.
- Touch targets ≥ 44px. Test at 200% zoom and 320px width.
- Charts have text alternatives or a data table fallback.

## 8. Responsive rules

Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Design mobile-first. Filters become a bottom sheet, the compare matrix scrolls horizontally with a sticky first column, tables collapse to stacked rows below `md`.

## 9. Performance & polish checklist

- Route-level code splitting; lazy-load charts and the admin area.
- Responsive images (`srcset`), WebP/AVIF, explicit width and height.
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 95 on core pages.
- Consistent iconography (Lucide, 1.5px stroke, one size scale).
- Both themes verified on every screen before a phase is marked done.
- Before finishing any UI step, remove one decorative element. If nothing is lost, it should not have been there.

## 10. Process for any new screen

1. State the screen's single job in one sentence.
2. Sketch the layout (ASCII is fine) and list its states: loading, empty, error, populated, fallback.
3. Build with tokens and existing components only; add a new component only if reuse is impossible.
4. Check keyboard, mobile width, dark mode, reduced motion.
