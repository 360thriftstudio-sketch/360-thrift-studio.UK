# 360 Thrift Studio UK

B2B wholesale catalogue with a **Request for Quote** basket instead of a checkout.
Next.js (App Router) + Payload CMS 3 + Postgres + Tailwind v4, in one app.

## Getting started

```bash
cp .env.example .env            # set DATABASE_URL and PAYLOAD_SECRET
docker compose up -d postgres   # or use Neon / Supabase / Render Postgres
pnpm install
pnpm migrate                    # create the database schema
pnpm seed                       # catalogue taxonomy, info pages, settings, first admin user
pnpm seed:demo                  # optional: + 45 DEMO- lots so listings have content
pnpm dev                        # site: http://localhost:3000  admin: /admin
```

After changing a collection: `pnpm migrate:create <name>` then `pnpm generate:types`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint, `tsc --noEmit` |
| `pnpm test:unit` / `pnpm test:coverage` | Vitest; `lib/pricing.ts` must stay at 100% coverage |
| `pnpm test:e2e` | Playwright + axe (set `PW_CHROMIUM_PATH` to use a preinstalled Chromium) |
| `pnpm migrate` / `pnpm migrate:create` | Run / create database migrations (`src/migrations`) |
| `pnpm seed` / `pnpm seed:demo` | Upserts taxonomy, pages and settings (safe to re-run); `:demo` adds DEMO- lots |
| `pnpm generate:types` | Regenerates `src/payload-types.ts` after changing collections |

## Structure

```
src/app/(site)            public site: home, /shop, /brands, /styles, /lot, /quote, /account, /catalogue, info + legal
src/app/api               rfq, enquiry, quote-action route handlers
src/app/(payload)         Payload admin + REST/GraphQL API
src/collections           one Payload collection per file
src/globals/Settings.ts   SHOW_BRAND_LOGOS, announcement, contact, trust strip
src/components/ui         primitives (Button, Badge, Chip, Drawer, QuantityStepper…)
src/components/brand      brand-board graphics: Crown, Arrow, Sparkle, Splatter, Drip, Stroke, Highlight
src/components/patterns   Header, MegaMenu, MobileNav, Footer, Breadcrumbs, BrandLogo, BrandMarquee, StudioLogo, Reveal
src/components/catalogue  listing engine UI: LotCard, QuickView, FilterPanel, ListingToolbar, LoadMore, ListingView
src/components/lot        Gallery, BuyBox, MixBreakdownChart, RecentlyViewed
src/components/quote      basket drawer, PriceTag, PriceTierTable, AddToQuoteButton, RFQFlow
src/components/account    QuoteStatusBadge, QuoteActions, SavedLots
src/components/forms      Field kit (labels above, errors on blur, error summary), AuthPanel, EnquiryForm
src/components/blocks     home/info blocks: Hero, TrustStrip, SectionTiles, FeaturedCollections, LotCarousel…
src/lib                   pricing.ts, facets.ts, catalogue.ts, rfq.ts, schemas.ts, basket-store.ts, brand-logos.ts
src/styles/tokens.css     design tokens — the single source of values
seed/source/build_taxonomy.py  source of truth for the catalogue taxonomy → generates seed/taxonomy.json
seed/pages.json           info + legal page copy (legal pages are DRAFTS — replace before launch)
seed/demo-lots.ts         DEMO- lots for design review (delete before launch)
public/brand              logo files from the brand board
```

## Brand

From the brand board: Thrift Yellow `#FFD400`, Studio Blue `#0066FF`, Cycle Green `#22B14C`,
Bold Black `#000000`, Clean Cream `#FFFDF5`. Anton (condensed headings / tagline), Montserrat (body),
Permanent Marker (accents only). Contrast rule: **blue** carries white text (CTAs, links);
**yellow and green are fills behind black text only** (they fail AA as text on cream).
Logo is a raster crop from the brand board until the vector SVG + dotLottie arrive.

## Rules that matter

- **Pricing** lives only in `src/lib/pricing.ts` (integer pence, tier bands, price lists, visibility).
- **Brand logos**: a third-party logo shows only when Settings → *Show brand logos* is on **and** the brand
  has *Logo approved*. Both default to off. Otherwise a text wordmark is shown. See `src/lib/brand-logos.ts`.
- **Quotes** get a `QR-YYYY-####` reference, soft-reserve for 48 h and follow the status machine in `src/lib/rfq.ts`.
- Styling uses tokens only: Tailwind's default palette is switched off in `globals.css`.

## Build phases

- [x] **Build 1 — foundation**: repo, Payload collections, tokens, primitives, Header/MegaMenu/Footer, seed, pricing + RFQ logic, CI
- [x] **UI/UX + brand**: brand board applied; all 8 templates built from the catalogue taxonomy
- [x] Build 2 — catalogue: listing engine, 14 facets with counts, URL state, search, LotCard, QuickView, lot/brand/collection/style pages
- [x] Build 3 (core) — quote basket, tier pricing, RFQ stepper, customer accounts, quote actions, enquiry forms
- [ ] Remaining: CSV import, BulkMatrix / quick order by SKU, quote PDF + email adapter (Resend), Storybook,
      dotLottie logo animations, flipbook + generated PDFs, CMS page blocks, Turnstile, cookie banner, Lighthouse CI
