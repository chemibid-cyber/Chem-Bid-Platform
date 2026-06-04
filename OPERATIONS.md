# OPERATIONS — Chemical Auction Platform

Runbook for deploying and operating the platform. Pairs with `README.md` (local setup).

## 1. Environment variables

All keys are in `.env.example`. Set them in Vercel → Project → Settings → Environment Variables.

| Var | Purpose | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin (auth, storage, cron) | **secret** |
| `DATABASE_URL` | Drizzle/Postgres (pooler string) | **secret** |
| `GST_PROVIDER` | `mock` or `surepass` | keep `mock` until vendor key exists |
| `SUREPASS_API_TOKEN` / `SUREPASS_BASE_URL` | Real GST verification | Phase 2 |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email | no key ⇒ console-log transport |
| `PUBCHEM_BASE_URL` | CAS lookup base | default public PUG-REST |
| `CRON_SECRET` | Guards `/api/cron/*` | **secret**, long random |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL | e.g. `https://app.example.com` |
| `OPERATOR_EMAILS` | Seeds operator accounts | comma-separated |

## 2. Database + storage setup (once per environment)

```bash
npm run db:migrate                       # apply drizzle/ migrations
```

Then, in the Supabase SQL editor, run in order:
1. `supabase/01_enable_rls.sql` — enables RLS (default-deny) + revokes audit_log UPDATE/DELETE.
2. `supabase/02_policies.sql` — the blind-bidding SELECT policies + helper functions.
3. `supabase/03_storage.sql` — creates the private `auction-files` bucket.

Seed operators:
```bash
npx tsx scripts/seed-operator.ts         # prints a temp password per OPERATOR_EMAILS entry
```

## 3. Cron (Vercel)

`vercel.json` registers three jobs (guarded by `CRON_SECRET`, which Vercel injects as a Bearer token):

| Path | Schedule | Job |
|---|---|---|
| `/api/cron/close-auctions` | every 5 min | close past-deadline auctions → awaiting_decision / unsuccessful |
| `/api/cron/stage2-timers` | every 5 min | final-2h Stage-2 urgency email (once) |
| `/api/cron/awaiting-cap` | daily 02:00 | archive 14-day-stale awaiting_decision; completion-score penalty |

> Sub-daily cron requires a Vercel paid plan. On Hobby, lengthen the schedule or trigger
> `/api/cron/*` from an external scheduler with `Authorization: Bearer $CRON_SECRET`.

## 4. Swapping the GST provider (mock → Surepass)

1. Get a Surepass API token; set `SUREPASS_API_TOKEN` (+ `SUREPASS_BASE_URL` if different).
2. Set `GST_PROVIDER=surepass`.
3. Verify the response field mapping in `src/lib/gst/surepass.ts` against Surepass's GSTIN-advanced
   payload (legal_name / address / pan_number) and adjust if their schema differs.
No app code beyond that adapter changes — the `GstVerificationProvider` seam isolates the vendor.

## 5. Pointing Resend at a real domain

1. Add + verify your sending domain in Resend (DNS records).
2. Set `EMAIL_FROM="Chemical Auction <noreply@yourdomain.com>"` and `RESEND_API_KEY`.
3. Without a key, emails are logged to the server console (safe for dev/staging).

## 6. Security verification

Run the two-company RLS proof against the live project (setup steps in the file header):
```bash
SUPABASE_URL=… SUPABASE_ANON_KEY=… A_EMAIL=… A_PASS=… B_EMAIL=… B_PASS=… \
  npx tsx scripts/rls-two-company-test.ts
```
Expect: seller A cannot read seller B's bid/identity; audit_log unreadable + immutable.

## 7. Smoke-test checklist (post-deploy)

- [ ] `/` renders; `/login`, `/signup` reachable.
- [ ] Signup with a valid-format GSTIN → company + admin created; lands on `/dashboard`.
- [ ] Add a catalog item with CAS `108-88-3` → resolves to Toluene; second time hits `cas_cache`.
- [ ] Buy mode → publish an auction (verified gate passes); a matching seller is notified.
- [ ] Seller: Accept & Quote (Ex-Works hides freight); blind rank shows.
- [ ] Cron `close-auctions` (or wait) → auction → awaiting_decision.
- [ ] Buyer: launch Stage-2; seller responds (final rate > Stage-1 is rejected).
- [ ] Buyer: Confirm deal → both emails fire (or console); `/deals/[id]` shows the record.
- [ ] Raise a dispute → appears in `/operator/disputes`; operator resolves it.
- [ ] Operator: GST override + suspend/reinstate a company; analytics populate.
- [ ] Export `/api/export/auction/[id]?format=pdf|csv` downloads.
- [ ] Install as PWA (manifest + icons + service worker).

## 8. Things that still need a human (see CLAUDE.md §11)

- T&C / Deal Confirmation Record legal review (governing law, arbitration seat).
- Surepass contract + key. News licensing (Phase 4). Real success-metric targets.
- Production-grade rate limiting (swap the in-memory limiter for Upstash/Redis).
- Optional: virus-scan uploads (e.g. a Supabase Edge Function on the storage hook).
