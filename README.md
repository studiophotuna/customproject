# Cake Bakery Storefront & CMS

A themeable e-commerce storefront with an admin CMS, built to be resold and
rebranded per client. Reference build: **La JAYSIEDEL Cakes** (Dubai).

## Stack

- **Next.js (App Router) + TypeScript** — storefront and admin in one app
- **Tailwind CSS v4** — design system driven by CSS custom properties
- **Supabase** — Postgres, Auth (role-based), Storage _(Phase 2)_
- **Stripe** — online payments _(Phase 5)_
- **Vercel** — deployment _(Phase 6)_

## Project structure

```
src/
  app/
    (site)/          # public storefront (own layout: header + footer)
    layout.tsx       # root layout — fonts + theme injection
    globals.css      # design tokens → Tailwind utilities
  components/
    site/            # storefront components (+ home/ sections)
    ui/              # shared primitives (Button, Container, icons)
  config/
    theme.ts         # brand tokens (colors/fonts/radius) — swappable per client
    site.ts          # brand identity, nav, contact, socials
  lib/
    types.ts         # domain types (mirror the DB schema)
    seed.ts          # placeholder data (replaced by Supabase in Phase 3)
    utils.ts
```

## Theming

Brand look & feel lives in `src/config/theme.ts`. Values are serialized into CSS
variables and injected by the root layout, so a client can be rebranded by
changing one config (and, from Phase 2, from the admin panel — no redeploy).

## Status

Live: **https://customproject-mu.vercel.app** (admin at `/admin/login`).

1. **Foundation** — scaffold, design system, storefront shell ✅
2. **Backend** — Supabase schema, RLS, role-based auth ✅
3. **Storefront** — all pages, DB-driven ✅
4. **Admin panel** — role-based CMS (products, content, orders, settings) ✅
5. **Commerce** — cart + Stripe checkout ✅ (checkout activates once keys are set)
6. **Deploy** — Vercel ✅

## Enabling online payments

Checkout is built and degrades gracefully until these are set in the Vercel
project (Settings → Environment Variables), then redeploy:

- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API)
- `NEXT_PUBLIC_SITE_URL` (e.g. the production URL, for Stripe redirects)

Point the Stripe webhook at `POST /api/stripe/webhook` (event
`checkout.session.completed`).

## Rebranding for another client

Everything visual is DB-driven: edit brand, theme colors, hero, contact and
delivery from **Admin → Settings** (no redeploy). For a separate client
deployment, point `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(and the fallbacks in `src/config/public-env.ts`) at their own Supabase project.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```
