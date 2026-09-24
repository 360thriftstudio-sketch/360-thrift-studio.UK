# 360 Thrift Studio UK

B2B wholesale catalogue with a **Request for Quote** basket instead of a checkout.
Next.js (App Router) + Payload CMS 3 + Postgres + Tailwind v4, in one app.

## Getting started

```bash
cp .env.example .env            # set DATABASE_URL and PAYLOAD_SECRET
docker compose up -d postgres   # or use Neon / Supabase / Render Postgres
pnpm install
pnpm seed                       # 15 sections + taxonomy, and the first admin user
pnpm dev                        # site: http://localhost:3000  admin: /admin
```

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint, `tsc --noEmit` |
| `pnpm test:unit` / `pnpm test:coverage` | Vitest; `lib/pricing.ts` must stay at 100% coverage |
| `pnpm test:e2e` | Playwright + axe (set `PW_CHROMIUM_PATH` to use a preinstalled Chromium) |
| `pnpm seed` | Upserts `seed/taxonomy.json` into the CMS (safe to re-run) |
| `pnpm generate:types` | Regenerates `src/payload-types.ts` after changing collections |

## Structure

```
src/app/(site)            public site (root layout, home, not-found)
src/app/(payload)         Payload admin + REST/GraphQL API
src/collections           one Payload collection per file
src/globals/Settings.ts   SHOW_BRAND_LOGOS, announcement, contact, trust strip
src/components/ui         primitives (Button, Badge, Chip, Drawer…)
src/components/patterns   Header, MegaMenu, MobileNav, Footer, Breadcrumbs, BrandLogo, StudioLogo
src/components/blocks     page blocks (Hero, SectionTiles, StyleTiles, HowItWorks, TrustStrip)
src/lib                   pricing.ts, rfq.ts, brand-logos.ts, navigation.ts, seo.ts
src/styles/tokens.css     design tokens — the single source of values
seed/taxonomy.json        sections, subcategories, styles, brands, collections, descriptors
```

## Rules that matter

- **Pricing** lives only in `src/lib/pricing.ts` (integer pence, tier bands, price lists, visibility).
- **Brand logos**: a third-party logo shows only when Settings → *Show brand logos* is on **and** the brand
  has *Logo approved*. Both default to off. Otherwise a text wordmark is shown. See `src/lib/brand-logos.ts`.
- **Quotes** get a `QR-YYYY-####` reference, soft-reserve for 48 h and follow the status machine in `src/lib/rfq.ts`.
- Styling uses tokens only: Tailwind's default palette is switched off in `globals.css`.

## Build phases

- [x] **Build 1 — foundation**: repo, Payload collections, tokens, primitives, Header/MegaMenu/Footer, seed, pricing + RFQ logic, CI
- [ ] Build 2 — catalogue: listing engine, facets, search, LotCard, QuickView, lot/brand/style pages, CSV import
- [ ] Build 3 — quote engine: basket, BulkMatrix, RFQ stepper, account, quote admin, emails, quote PDF
- [ ] Build 4 — brand moments: StudioLogo Lottie, BrandMarquee, page transitions, skeletons
- [ ] Build 5 — catalogue book + content: flipbook, PDF generation, CMS page blocks, legal pages
- [ ] Build 6 — QA + launch

Storybook is not set up yet; it's planned for Build 2 alongside LotCard and the other patterns.
