# Chemical Auction — B2B reverse-auction marketplace

A verified, GST-anchored B2B reverse-auction platform for chemical procurement in India.
Buyers post a precise requirement (CAS + purity + quantity + packing); qualified sellers bid
**blindly and competitively**; a two-stage negotiation settles a price; **every action is
append-only audit-logged**.

> Scope: **not** payments, escrow, logistics, or international trade. Money and goods move
> off-platform. See `docs/Chemical-Auction-PRD-v1.0-BuildReady.md`.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript), Server Actions + Route Handlers |
| DB / Auth / Storage / Realtime | Supabase (Postgres) |
| ORM / migrations | Drizzle |
| Email | Resend (console-log fallback in dev) |
| GST verify | Swappable `GstVerificationProvider` (`MockGstProvider` now, Surepass later) |
| CAS lookup | PubChem PUG-REST + `cas_cache` |
| UI | Tailwind + shadcn-style components |
| Scheduled jobs | Vercel Cron → `/api/cron/*` |
| Shape | Installable PWA |

## Prerequisites

- Node 20+, npm 10+
- A Supabase project (free tier is fine)
- (Optional) A Resend API key — without one, emails are logged to the console

## Local setup

```bash
npm install
cp .env.example .env.local      # then fill in the values below
npm run db:generate             # (already committed) generate SQL from the Drizzle schema
npm run db:migrate              # apply migrations to your Supabase Postgres
# In the Supabase SQL editor, run supabase/01_enable_rls.sql (and 02_policies.sql once it exists)
npm run dev                     # http://localhost:3000
```

### Required environment variables (`.env.local`)

See `.env.example` for the full annotated list. The essentials:

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server-only secret) |
| `DATABASE_URL` | Supabase → Project Settings → Database (pooler/session string) |
| `GST_PROVIDER` | `mock` for now (keep until a Surepass key exists) |
| `RESEND_API_KEY` | Resend dashboard (optional in dev) |
| `CRON_SECRET` | any long random string; also set in Vercel |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; your domain in prod |
| `OPERATOR_EMAILS` | comma-separated emails seeded as platform operators |

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit (strict, no any)
npm run lint        # next lint
npm run test        # vitest (pure business-logic unit tests)
npm run db:generate # drizzle-kit generate (schema → SQL)
npm run db:migrate  # apply migrations
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel (framework auto-detected as Next.js).
3. Add every variable from `.env.example` in **Project → Settings → Environment Variables**
   (use the production Supabase keys; set `NEXT_PUBLIC_APP_URL` to your Vercel domain).
4. Run the DB setup against your Supabase Postgres once: `npm run db:migrate`, then execute
   `supabase/01_enable_rls.sql` (and `02_policies.sql`) in the Supabase SQL editor.
5. Vercel Cron is configured in `vercel.json` (auction close, Stage-2 timers, awaiting-decision cap).
6. Deploy. See `OPERATIONS.md` for swapping the GST provider to Surepass and pointing Resend at a
   real sending domain.

## Project memory & docs

- `CLAUDE.md` — project memory (decisions, build progress, implementation log).
- `docs/` — the decision-complete PRD, staged build prompts, the 24 closed decisions, and the
  skills-integration guide.
