# Claude Code Build Prompts — B2B Chemical Auction Platform

**Companion to:** `Chemical-Auction-PRD-v1.0-BuildReady.md`
**Target:** one-shot Phase-1 build, deployable to Vercel
**Stack:** Next.js 14 (App Router, TS) · Supabase (Postgres/Auth/Storage/Realtime) · Drizzle · Resend · Tailwind + shadcn/ui

---

## How to use this file

Feed these prompts to Claude Code **in order**. Each is self-contained and references decisions from the PRD so Claude Code never has to guess. Prompt 0 is the master context — paste it **once at the start of the session** so every later prompt inherits it. Then run Prompts 1→8 in sequence, testing after each.

> **Why staged, not one giant prompt?** A single 5,000-word prompt produces a sprawl Claude Code can't keep coherent. Staged prompts each fit in a tight reasoning window, build on a verified foundation, and let you catch drift early. This *is* the "one shot" — just sequenced so each stage lands cleanly.

A `### CHECK` block follows each prompt: what to verify before moving on.

---

## PROMPT 0 — Master context (paste once, first)

```
You are building a B2B chemical reverse-auction marketplace for the Indian market, deployed on Vercel. Read this context carefully; it governs every later instruction in this session.

PRODUCT IN ONE LINE: Verified buyers post a precise chemical requirement (CAS + purity + quantity); qualified sellers bid blindly and competitively; a two-stage negotiation settles a price; every action is audit-logged. It is NOT payments, escrow, logistics, or international trade — those are out of scope.

STACK (locked — do not substitute):
- Next.js 14 App Router, TypeScript, Server Actions + Route Handlers
- Supabase for Postgres, Auth (email/password), Storage, and Realtime
- Drizzle ORM with migrations
- Resend for transactional email
- Tailwind CSS + shadcn/ui
- Vercel Cron for scheduled jobs (auction close, Stage-2 timers)
- Responsive PWA (installable, push-ready), mobile + desktop

NON-NEGOTIABLE DECISIONS (from the PRD — encode these exactly):
1. Identity = one GSTIN per company account. Legal name + address come from a GST verification API (behind a swappable `GstVerificationProvider` interface; stub the provider with a mock now, real vendor later). Never let users hand-edit the legal name. Store PAN (GSTIN chars 3–12).
2. Roles = one user has boolean `can_buy` and `can_sell` capabilities + `is_admin`. A user with both sees a Buy/Sell mode toggle. Admin has both. No separate Sales/Purchase logins.
3. Bids are ALWAYS for the full auction quantity. NO partial-quantity bids. Single winner. (This is critical — do not add partial-bid logic anywhere.)
4. Ranking = lowest Total Rate per unit; ties broken by earlier timestamp. Blind mode shows a seller only their own rank.
5. Closure produces a "Deal Confirmation Record" — NEVER label anything "legally binding." It records mutual intent under signup T&Cs.
6. Audit log is APPEND-ONLY. Nothing is ever hard-deleted; withdrawals/cancellations are status changes appended to history.
7. CAS lookup uses PubChem PUG-REST, but cache results in a `cas_cache` table and handle 0 / 1 / many matches (manual override on 0, disambiguation picker on many).
8. Units: an auction is in kg, MT, or L; all bids inherit that unit.
9. DPDP-aware: consent checkbox at signup, no children's data, support data export + deletion request.

CODE STANDARDS:
- Strict TypeScript, no `any`.
- Server Actions for mutations; Route Handlers for webhooks/cron.
- Row-Level Security ON for all tables; encode "identities masked during bidding, revealed after accept" as access rules.
- Every mutation writes to `audit_log`.
- Use environment variables for all secrets; produce a `.env.example`.

Acknowledge you understand, then wait for the next prompt. Do not start coding yet.
```

### CHECK
Claude Code restates the stack and the 9 decisions accurately. If it proposes partial bids, a different DB, or "legally binding" — correct it before continuing.

---

## PROMPT 1 — Scaffold + schema + auth foundation

```
Scaffold the project and build the data layer and auth foundation.

1. Initialize Next.js 14 (App Router, TS, Tailwind, ESLint, src/ dir, import alias @/*). Install: @supabase/supabase-js, @supabase/ssr, drizzle-orm, drizzle-kit, postgres, resend, zod, shadcn/ui, lucide-react. Init shadcn/ui.

2. Create the full Drizzle schema for these tables (Postgres). Include created_at on all, and the constraints noted:
- companies(id, gstin UNIQUE, pan, legal_name, registered_address, verification_status enum[pending,verified,rejected], completion_score int default 100)
- users(id, company_id FK, first_name, last_name, email UNIQUE, phone, designation, team, can_buy bool, can_sell bool, is_admin bool, status enum[active,disabled])
- catalog_items(id, company_id FK, owner_user_id FK, profile_type enum[sales,purchase], cas_number, name, name_verified bool, is_mixture bool, mixture_text, roles text[] (mfr/dist/trader), grade enum[pure,distilled,trade], min_purity numeric) UNIQUE(company_id, cas_number, profile_type)
- cas_cache(cas_number PK, resolved_name, cid, status enum[found,not_found,ambiguous])
- auctions(id, buyer_company_id, buyer_user_id, cas_number, name, quantity numeric, unit enum[kg,mt,l], min_purity, packing, delivery_address, logistics_basis enum[delivered,exworks], supplier_filter text[], spec_file_url, remarks, privacy_mode enum[all,registered], blind bool, status enum[draft,active,awaiting_decision,closed,unsuccessful,cancelled], stage enum[stage1,stage2,closed], closes_at timestamptz, created_at)
- registered_partners(id, buyer_company_id, partner_gstin, cas_number, status enum[active,pending])
- bids(id, auction_id, seller_company_id, seller_user_id, stage1_basic numeric, stage1_freight numeric, stage1_total numeric, payment_terms enum[advance,net15,net30,net45,lc], lead_time_days int, coa_file_url, coa_on_dispatch bool, stage2_rate numeric, stage2_action enum[accept,reject,final], status enum[active,withdrawn,expired,won,lost], created_at, updated_at)
- proactive_shares(id, seller_company_id, seller_user_id, cas_number, name, quantity, unit, grade, min_purity, basic_rate, freight_rate, packing, spec_file_url, valid_until, privacy_mode, status)
- blocks(id, blocker_company_id, blocked_company_id, cas_number NULLABLE, scope enum[this_cas,all])
- deals(id, auction_id, buyer_company_id, seller_company_id, final_total, payment_terms, lead_time_days, status enum[confirmed,disputed], confirmed_at)
- notifications(id, user_id, type, payload jsonb, read_at)
- audit_log(id, actor_user_id, entity_type, entity_id, action, snapshot_json jsonb, created_at) — APPEND ONLY
- disputes(id, deal_id, raised_by_user_id, reason, evidence_url, status enum[open,resolved])

3. Generate the Drizzle migration and a Supabase SQL file that also enables RLS on every table (policies added in Prompt 7 — for now, default-deny with a permissive policy only for the service role).

4. Build Supabase auth: signup, login, logout, forgot-password (email reset), 12h idle session timeout, min-8-char complex password, bcrypt via Supabase. Member-set password on first-login invite. Create a `lib/audit.ts` helper that every mutation will call.

5. Create a `lib/gst/provider.ts` exporting a `GstVerificationProvider` interface { verify(gstin): Promise<{legalName, address, pan, ok}> } and a `MockGstProvider` returning deterministic fake data so we can build without a real vendor key. Wire signup to call it.

6. Produce .env.example with all keys (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE, RESEND_API_KEY, GST_PROVIDER=mock, etc.) and a README with setup + deploy-to-Vercel steps.

Build it, run the migration, and confirm the app boots with a working signup→login→logout.
```

### CHECK
App boots; signup creates a company (mock GST) + admin user; audit_log gets a row; `.env.example` and README exist. Tables match the PRD data model.

---

## PROMPT 2 — Company onboarding, members, catalog + CAS lookup

```
Build onboarding, member management, and the catalog.

ONBOARDING:
- Signup flow: enter GSTIN → call GstVerificationProvider → show fetched legal name + address (read-only) → user confirms, sets password, accepts T&C checkbox (DPDP consent + Deal-Confirmation-Record terms link) → first user becomes is_admin with can_buy=can_sell=true.
- If GST verify fails/unavailable: allow provisional signup with verification_status=pending; show a banner; block auction publish + bidding until verified (enforce later in Prompt 4/5).

MEMBERS (admin only):
- Add member (first/last, corporate email, phone, designation, team, can_buy, can_sell). Send Resend invite email; member sets own password on first login.
- Disable member: REQUIRE a guided "reassign or cancel" modal — reassign their catalog_items + any live auctions/bids to another capable member before disable completes. Block disable if unresolved.

CATALOG (sales or purchase profile, switched by mode toggle):
- Add item: enter CAS → resolve via PubChem PUG-REST (check cas_cache first; on miss call name/<cas>/cids + synonyms, dedup CIDs). Handle: 0 results → manual name entry (name_verified=false); exactly 1 → autofill bold locked name; 2+ → disambiguation picker. Cache every result.
- "N/A" toggle → mixture free-text name (is_mixture=true).
- Fields: roles (mfr/dist/trader multi-select), grade (pure/distilled/trade with tooltip definitions), min_purity %.
- Uniqueness: one CAS per user per profile_type within company. On collision show "This product is already managed by [Name] ([Designation], [Team]) — [contact]" PLUS a "Request transfer" button that notifies current owner + admin.
- Edit item; delist item (BLOCK with warning if it has a live auction/bid).

Write everything through lib/audit.ts. Build and test: add member, add a catalog item with a real CAS (e.g. 108-88-3 Toluene), trigger a collision.
```

### CHECK
CAS 108-88-3 resolves to Toluene and caches; collision message + transfer button appear; disabling a member forces reassignment; invite email sends (or logs in dev).

---

## PROMPT 3 — Auction creation + targeting + registered network

```
Build the buyer's auction creation flow and the targeting engine.

AUCTION FORM (purchase mode):
- Fields: validated CAS (locks name bold), quantity + unit (kg/mt/l), min_purity %, packing, delivery address (default = registered, or custom), logistics_basis (delivered/exworks), supplier_filter (mfr/dist/trader multi), one spec attachment (PDF/JPG/PNG, ≤10MB, store in Supabase Storage with signed-URL access), remarks, closing date/time.
- Closing timer bounds: min 6h, max 14d from now, IST display. Validate.
- privacy_mode (all / registered) + blind toggle.
- Empty-network safeguard: privacy_mode=registered with zero ACTIVE partners for that CAS → block publish, prompt to register/invite a vendor or switch to All.
- Block publish if company verification_status != verified.

REGISTERED NETWORK:
- Register partner by GSTIN + CAS. If GSTIN not on platform → create status=pending placeholder + send invite email (growth loop). Registered-Only auctions skip pending partners and show "N invited partners haven't joined yet."
- A company is NOTIFIED when registered into someone's network and can decline (DPDP consent).
- Edit/remove a partner.

TARGETING ENGINE (run on publish):
- Match sellers whose sales-profile catalog has the same CAS + compatible grade.
- For mixtures: tokenize remarks/name on whitespace+punctuation, match WHOLE TOKENS only (case-insensitive) — never substring.
- Drop sellers whose declared roles don't intersect the buyer's supplier_filter.
- Drop sellers who have blocked this buyer (or this CAS).
- Notify qualified sellers: in-app notification + Resend email.

Audit every action. Test: publish an auction, confirm only role+CAS-matched sellers get notified, confirm a pending-partner invite sends.
```

### CHECK
Auction publishes only when verified; timer bounds enforced; targeting notifies exactly the matching sellers and excludes blockers/role-mismatches; pending-partner invite fires.

---

## PROMPT 4 — Stage-1 blind bidding + seller gate

```
Build the seller's side of Stage-1.

SELLER GATE (on opening a notified auction):
- Show basic requirements with pricing LOCKED. Three buttons: "Accept & Quote" (unlocks spec + bid form), "Ignore" (moves to a collapsible Ignored list with an "Un-ignore" action while auction is open), "Block This Purchaser" (this-CAS-only or all-requests).
- After Accept: header reveals buyer corporate name + acting user + designation; seller can download the spec file (signed URL).

BID FORM (full quantity only — NO partial qty field anywhere):
- stage1_basic (₹/unit) + stage1_freight (₹/unit) → auto-sum stage1_total.
- Ex-Works rule: if auction logistics_basis=exworks, HIDE freight and force it to 0; total=basic. If delivered, freight required.
- payment_terms dropdown (advance/net15/net30/net45/lc) + lead_time_days.
- COA upload (required) UNLESS "COA on dispatch (make-to-order)" checkbox is ticked → then coa_on_dispatch=true, shown to buyer as a flag.
- Submit, revise, or WITHDRAW (status=withdrawn, retained in audit) any time before close.

BLIND RANK:
- If auction.blind, seller sees ONLY their live rank (e.g. "#3") by lowest stage1_total; ties → earlier created_at wins. Use Supabase Realtime so rank updates live. Mask all competitor identity + prices.

CLOSE (Vercel Cron, runs every few minutes):
- At closes_at: lock bids, set auction status. If zero bids → status=unsuccessful, notify buyer, offer "Clone & relist". If bids exist → status=awaiting_decision, stage stays stage1, notify buyer bids are ready.

Audit every bid/withdraw/block. Test: two sellers bid, confirm blind rank + tie-break + Ex-Works freight zeroing + cron close.
```

### CHECK
Ex-Works hides freight; blind rank live-updates and tie-breaks by timestamp; withdrawal keeps an audit row; cron moves a zero-bid auction to Unsuccessful with a Clone option.

---

## PROMPT 5 — Stage-2 counter-offer loop

```
Build the single-round Stage-2 negotiation.

STAGE-1 REVIEW (buyer, after close):
- Bids sorted lowest→highest stage1_total, auction average shown. Expand a card → full corporate + contact details + spec/COA downloads.
- Buyer can either go straight to closure (Prompt 6) OR launch Stage-2.

STAGE-2 (single round, all participants):
- Buyer sets ONE target counter-rate → blasted to ALL Stage-1 participants. Set auction.stage=stage2 and a strict 24h timer (store stage2_closes_at).
- Each seller: Accept / Reject / Submit Final Alternative Rate. PRICE-DROP LOCK: stage2_rate must be ≤ their stage1_total (reject higher with input error).
- Final 2 hours: hide ranks, send urgent push + email with the ₹ rate in the SUBJECT line.
- No response in 24h → that seller's stage2 status=expired BUT their stage1 bid is preserved and still selectable.
- ALL sellers reject the counter → buyer falls back to Stage-1 prices automatically (auction not dead). The leaderboard (Prompt 6) takes the LOWER of stage1/stage2 per seller, so this just leaves stage1 standing.

Single round only — no subsets, no repeat rounds. Cron handles the 24h + 2h transitions. Audit every counter/response. Test the price-drop lock and the all-reject fallback.
```

### CHECK
Counter blasts to all; price-drop lock rejects an increase; expiry preserves Stage-1; all-reject leaves Stage-1 intact; 2-hour urgency email has the rate in the subject.

---

## PROMPT 6 — Closure, leaderboard, Deal Confirmation Record, disputes, export

```
Build closure and the deal lifecycle.

SUPER-COMPARISON LEADERBOARD:
- Per seller, take the LOWER of stage1_total or stage2_rate; sort sellers by that. Show combined summary card: Stage-1 block (qty, basic, freight, total, payment_terms, lead_time) + Stage-2 block (counter target + final action) + document downloads. No time limit on the buyer.

DEEP-DIVE + BLOCK:
- Click a vendor → full corporate footprint + "Block Seller for this CAS" (permanent mute for this buyer+CAS; historical bids retained with a 🔴 [Blocked] tag).

DEAL CONFIRMATION RECORD (single winner):
- "Confirm Deal" → mark winning bid status=won, others=lost, create deals row (status=confirmed), lock the auction (status=closed). Email BOTH parties identical Resend confirmations: corporate disclosures, contacts, final commercials (qty, payment_terms, lead_time, split pricing). The email states it records MUTUAL INTENT under the signup T&Cs — do NOT use the words "legally binding."

DISPUTES (post-confirmation):
- Either party can mark a confirmed deal "Disputed" (reason + optional evidence upload) → creates a disputes row + Operator case. The deal record is NEVER deleted; the status change is appended to audit_log.

EXPORT:
- Buyer and seller can export a closed auction/deal as PDF and CSV (use a server-side PDF lib).

AWAITING-DECISION CAP: an auction in awaiting_decision for 14 days auto-archives to closed (bids preserved), via cron.

Audit everything. Test: confirm a deal → both emails fire → raise a dispute → export PDF.
```

### CHECK
Leaderboard uses the lower rate; Confirm Deal emails both parties and never says "legally binding"; dispute appends (never deletes); PDF/CSV export works.

---

## PROMPT 7 — RLS, DPDP, notification center, security baseline

```
Lock down access, privacy, and notifications.

ROW-LEVEL SECURITY (the core privacy guarantee):
- Encode "identities masked during bidding, revealed after accept": a seller cannot read another seller's bid; a buyer cannot see seller identity until that seller has Accepted (or the auction has closed); competitor prices are never readable in blind mode.
- Users can only read their own company's data except where an auction/share explicitly exposes a counterparty.
- audit_log: insert-only, no update/delete policy for anyone.
Write Supabase RLS policies for every table accordingly.

NOTIFICATION CENTER:
- Persistent in-app list with read/unread + history (replace transient-only pop-ups). Mark-as-read.
- Email preferences page: unsubscribe for NON-transactional emails (market feed later); transactional auction emails are non-unsubscribable but clearly labelled.

DPDP COMPLIANCE:
- Privacy policy + T&C pages. Consent captured at signup (already) — surface it in profile.
- "Export my data" (JSON) and "Request account deletion" flows (deletion = soft-disable + queued purge respecting any open-dispute legal hold; never breaks audit history).
- No children's data (B2B only) — state in policy.

SECURITY BASELINE:
- Rate-limit auth endpoints (5 attempts → temp lockout) and auction creation (max N/company/day — set N=20).
- All file downloads via signed URLs scoped to qualified users.
- Add a completion_score: decrement for a company that repeatedly never confirms after receiving bids; surface it to sellers (anti price-fishing).

Test RLS with two companies: confirm seller A cannot read seller B's bid, and buyer cannot see seller identity pre-accept.
```

### CHECK
Cross-company read attempts fail; pre-accept identity is masked; audit_log rejects updates/deletes; export + deletion flows work; rate limits trigger.

---

## PROMPT 8 — Operator console + dashboards + PWA polish

```
Build the Operator (platform-side) console and finish the app.

OPERATOR CONSOLE (separate gated role — seed one operator account):
- Moderation queue (reported actors).
- Dispute queue (open disputes from Prompt 6) with resolve action.
- Manual GST override (mark a pending company verified/rejected).
- Suspend/unsuspend a company account (with a user-facing suspended-state screen).
- Analytics dashboard: total auctions, bids, completion rate, active companies, qualified-bids-per-auction median, time-to-close median, and a rough burn estimate (GST calls + emails + storage).

USER-FACING DASHBOARDS:
- Buyer & seller home: Active / Closed / Expired-Unsuccessful sector folders for both Purchase and Sales modes. Cards: corporate name (line 1) + user/designation (line 2).
- Clone & re-run a past auction (one click).

PWA:
- Add manifest + service worker (installable, offline shell). Mobile-first responsive pass over every screen.

FINAL: write a short OPERATIONS.md (env vars, cron schedule, how to swap the GST provider from mock to Surepass, how to point Resend at a real domain) and a smoke-test checklist. Run a full end-to-end pass: signup → catalog → auction → bid → Stage-2 → confirm → dispute → operator resolve.
```

### CHECK
Operator can resolve a dispute, override GST, suspend a company, and see live metrics; sector folders + clone work; app installs as a PWA; full E2E pass green.

---

## Post-build: Phase 2+ prompts (when you're ready)

Keep these for later — do not run during the Phase-1 one-shot:
- **Phase 2:** real GST vendor (swap MockGstProvider → SurepassProvider), web push + SMS for urgency, 2FA (OTP), richer export.
- **Phase 3 (only if data justifies):** partial bids + multi-award basket UI + per-line confirmations (this re-opens ranking/closure — treat as a major change), reputation beyond completion-score, multi-round counters, multi-GSTIN corporate-group rollup, full proactive-share negotiation.
- **Phase 4:** AI market feed — daily Vercel Cron pulls a LICENSED news source, tags articles by chemical, pre-computes per-profile feeds (batch, NOT real-time per-user LLM calls).

---

## Why this sequence is safe to run as "one shot"

Each prompt builds on a *tested* foundation, touches one slice of the system, and re-states the decisions it depends on — so Claude Code never re-derives a contradiction (the partial-bid trap, the freight/Ex-Works clash, the "legally binding" overclaim) that the v0.1 spec would have walked straight into. The CHECK gates are your seams: if one fails, you fix it before the next prompt compounds it. That's how a complex marketplace gets built coherently in a single session instead of unraveling halfway.
```
