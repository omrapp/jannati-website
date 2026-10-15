# Jannati

Bilingual (Arabic / English) beauty e-commerce storefront and admin dashboard for the GCC, built with Next.js and Supabase.

**Version:** 0.1.0 · **License:** [Apache 2.0](LICENSE)

## Features

- **Storefront** — home, product listing with filters and sorting, product detail with reviews, brands, collections, search, cart, checkout, order lookup, customer account, About and Contact pages.
- **Locale-country routing** — every URL carries language and country, e.g. `/ar-om` or `/en-ae`. Language drives translation and text direction (RTL for Arabic). Country drives currency, VAT, shipping and product availability.
- **GCC coverage** — Oman, UAE, Saudi Arabia, Kuwait, Qatar, Bahrain. Money is stored as integer minor units; OMR, KWD and BHD use 3 decimals.
- **Payments** — Thawani, Tap and cash on delivery, with idempotent webhook handling.
- **Notifications** — email via Resend, SMS / WhatsApp via Twilio.
- **Admin dashboard** (`/admin`) — products, categories, brands, banners, coupons, content pages, countries, orders, invoices, customers, reviews, contact messages, analytics and settings. Bilingual, with light / dark theme.
- **SEO** — per-locale metadata and JSON-LD product data.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui |
| i18n | next-intl |
| Backend | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Testing | Vitest (unit), Playwright (e2e) |
| CI / Hosting | GitHub Actions, Vercel |

## Getting started

### Prerequisites

- Node.js 22.6 or later
- npm
- A Supabase project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for migrations and type generation)

### Installation

```bash
git clone https://github.com/omrapp/jannati-website.git
cd jannati-website
npm install
cp .env.example .env.local
```

Fill in `.env.local`. Only the site and Supabase values are needed to run locally; payment and notification keys are needed only for those features. See [.env.example](.env.example) for the full list.

> `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Keep it server-side and never commit `.env.local`.

### Database

```bash
npm run db:link    # link the Supabase CLI to SUPABASE_PROJECT_REF
npm run db:push    # apply supabase/migrations
npm run db:types   # regenerate src/lib/supabase/types.ts
```

### Run

```bash
npm run dev        # http://localhost:3000 → redirects to /ar-om
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run format` | Format with Prettier |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run db:push` / `db:pull` / `db:types` | Supabase migrations and types |
| `npm run seed:*` | Catalog seed pipeline (needs local source data, not included in the repo) |

## Project structure

```
src/
  app/
    [locale]/        storefront routes (ar-om, en-ae, ...)
    admin/           admin dashboard
  components/        UI, layout, commerce and admin components
  i18n/              locale config and routing
  lib/               catalog, commerce, payments, notifications, auth, supabase, seo
  messages/          ar.json, en.json translations
supabase/migrations/ database schema and RLS policies
scripts/seed/        catalog seed pipeline
e2e/                 Playwright tests
```

## Branches

- `main` — production
- `develop` — integration branch; feature branches start here

Earlier feature branches are kept as tags.

## Security

Found a vulnerability? Please report it privately to the maintainer instead of opening a public issue.

## License

Licensed under the [Apache License 2.0](LICENSE).
