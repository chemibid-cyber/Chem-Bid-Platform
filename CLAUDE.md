# CLAUDE.md — Project Memory

> This is the persistent memory for the **B2B Chemical Auction Platform**. Claude Code loads this file automatically. Read it fully before doing anything. Then read the three docs in `./docs/` (or repo root) listed under "Source of truth."

---

## 0. What you are building (one paragraph)

A verified, GST-anchored B2B reverse-auction marketplace for chemical procurement in India. Buyers post a precise requirement (CAS number + purity + quantity + packing); qualified sellers bid **blindly and competitively**; a two-stage negotiation settles a price; **every action is append-only audit-logged**. It is **NOT** payments, escrow, logistics, or international trade — those are explicitly out of scope. Deploy target: **Vercel**.

---

## 1. Source of truth (read these, in order)

1. `docs/Chemical-Auction-PRD-v1.0-BuildReady.md` — the decision-complete PRD. Every requirement, justified. **This governs WHAT to build.**
2. `docs/Chemical-Auction-Build-Prompts.md` — 9 staged build prompts (Prompt 0 master context + Prompts 1–8). **This governs the ORDER you build in.**
3. `docs/DECISIONS.md` — the 24 closed decisions in one table. When in doubt, this wins.
4. `docs/SKILLS-INTEGRATION.md` — how to use the gstack + GitNexus skills at each step.

If anything you're about to do contradicts these files, **stop and re-read** — do not improvise a contradiction back into the design.

---

## 2. The 9 non-negotiable decisions (memorize — these are traps if violated)

1. **Identity = one GSTIN per company.** Legal name + address come from a GST API behind a swappable `GstVerificationProvider` interface (start with `MockGstProvider`). Never let users hand-edit the legal name. Store PAN (GSTIN chars 3–12).
2. **One user, two capability flags:** `can_buy` + `can_sell` + `is_admin`. A user with both gets a Buy/Sell mode toggle. **No separate Sales/Purchase logins. No "department" concept** — use a `team` label.
3. **Bids are ALWAYS full quantity. NO partial-quantity bids. Single winner.** (This is the #1 trap from the original spec. Do not add partial-bid logic anywhere, ever, in Phase 1–2.)
4. **Ranking = lowest Total Rate per unit; ties → earlier timestamp.** Blind mode shows a seller only their own rank.
5. **Closure = "Deal Confirmation Record."** NEVER write "legally binding" anywhere. It records mutual intent under signup T&Cs.
6. **`audit_log` is APPEND-ONLY.** Nothing is hard-deleted. Withdrawals/cancellations/disputes are status changes appended to history.
7. **CAS lookup = PubChem PUG-REST + `cas_cache` table.** Handle 0 (manual entry) / 1 (autofill) / many (disambiguation picker). Cache every result.
8. **Units:** an auction is in kg, MT, or L; all bids inherit that unit.
9. **Ex-Works hides + zeroes the freight field.** Delivered requires it. Payment terms + lead time are captured **on the bid form** (not invented at closure).

---

## 3. Locked stack (do not substitute)

| Concern | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript, Server Actions + Route Handlers |
| DB / Auth / Storage / Realtime | Supabase (Postgres) |
| ORM | Drizzle (migrations) |
| Email | Resend |
| Scheduled jobs | Vercel Cron → API routes (data-driven timers) |
| UI | Tailwind + shadcn/ui |
| GST verify | Surepass (real) behind adapter; `MockGstProvider` for now |
| CAS lookup | PubChem PUG-REST + `cas_cache` |
| Shape | Responsive PWA (installable, push-ready) |

---

## 4. Coding standards (enforce on yourself)

- Strict TypeScript. No `any`.
- Server Actions for mutations; Route Handlers for webhooks/cron.
- **Row-Level Security ON for every table.** Encode "identities masked during bidding, revealed after a seller Accepts; competitor prices never readable in blind mode."
- **Every mutation calls `lib/audit.ts`.** No exceptions.
- All secrets via env vars; keep `.env.example` current.
- Test coverage target ≥ 35% throughout (gstack discipline). Write tests as you go, not at the end.
- Conventional commits. Commit at every phase gate (see §6).

---

## 5. How to use the skills (gstack + GitNexus) — summary

Full mapping in `docs/SKILLS-INTEGRATION.md`. Short version:

- **GitNexus (context layer):** Run `gitnexus setup` once. After the scaffold exists and after each phase, run `gitnexus analyze --skills` to (re)build the knowledge graph + per-module SKILL.md files so you keep an accurate architectural view and stop breaking call chains. Reindex after big commits.
- **gstack (process layer — ~23 specialist slash commands):** First run `/help` (or list commands) to learn the **exact** command names installed, since they may differ from the roles below. Then at each gate invoke the relevant persona:
  - **Eng Manager / CEO** → lock architecture & scope before a phase.
  - **Designer** → review UI for AI-slop after building screens.
  - **Reviewer** → code review before commit.
  - **Chief Security Officer** → OWASP + STRIDE audit after Prompt 7 (RLS/DPDP) and before deploy.
  - **QA Lead** → open a real browser and test the flow after each phase.
  - **Release Engineer** → ship the PR at each gate.

If a gstack command and this file ever conflict on *product* decisions, **this file + the PRD win**. gstack governs *process*, not *product*.

---

## 6. Build sequence (run autonomously, gate by gate)

Execute the 9 prompts in `docs/Chemical-Auction-Build-Prompts.md` **in order**. Prompt 0 is master context (internalize it). Then for **each** of Prompts 1→8:

1. (gstack) Lock scope/architecture for this slice.
2. Build exactly what the prompt specifies — nothing from a later phase.
3. Run the prompt's `### CHECK` block. **Do not proceed until it passes.**
4. (gstack) Designer + Reviewer pass; write/run tests.
5. (GitNexus) `gitnexus analyze --skills` to reindex.
6. (gstack) Commit / open PR via the release persona. Update §8 below.

**Phase boundaries:** Prompts 1–8 = **Phase 1 (core loop)**. Do **not** build Phase 2/3/4 items (partial bids, AI feed, proactive-share negotiation, web push, 2FA, reputation) during this run — they are explicitly deferred. If you finish Phase 1 and CHECK-pass everything, stop and report.

---

## 7. Maintain your own memory (instructions to future-you)

- Keep this CLAUDE.md current. As you make implementation choices the docs didn't specify, **append them to §9 "Implementation log"** below with a one-line rationale, so the next session inherits them.
- If you discover a genuine contradiction in the PRD that blocks you, record it in §10 "Blocked / needs human" rather than silently resolving it in a way that violates §2.
- Never let memory drift from reality: if you change the schema or a decision, update §2/§3 and the relevant doc in the same commit.

---

## 8. Build progress (update as you go)

- [x] Prompt 1 — scaffold + schema + auth
- [x] Prompt 2 — onboarding + members + catalog/CAS
- [x] Prompt 3 — auction creation + targeting + network
- [x] Prompt 4 — Stage-1 blind bidding
- [x] Prompt 5 — Stage-2 counter loop
- [x] Prompt 6 — closure + leaderboard + dispute + export
- [x] Prompt 7 — RLS + DPDP + notifications + security
- [x] Prompt 8 — operator console + dashboards + PWA
- [x] Security audit (OWASP + STRIDE) green — CSO after P4 + P7, no 8+/10 findings; RLS two-company proof = `scripts/rls-two-company-test.ts` (run vs live Supabase)
- [~] Full E2E smoke test — runtime smoke green (public render + authed/operator routes 307-gate + cron 401 + PWA assets 200); full data-flow E2E scripted in OPERATIONS.md §7 (needs live Supabase)
- [~] Deploy to Vercel — build clean (29 routes), `vercel.json` + `OPERATIONS.md` ready; needs the user's Supabase/Vercel keys (steps in README + OPERATIONS)

## 9. Implementation log (append-only)

### 2026-06-04 — Skills layer mapping (gstack ↔ real commands, GitNexus)

Discovered installed tooling and mapped each SKILLS-INTEGRATION role to its real command:

| Role (SKILLS-INTEGRATION) | Real gstack skill/command | Notes |
|---|---|---|
| CEO / scope | `/plan-ceo-review` (also `/office-hours`) | Scope/ambition review (interactive) |
| Eng Manager / architecture | `/plan-eng-review` | Architecture lock (interactive) |
| Designer | `/design-review` (live) · `/plan-design-review` (pre-build) · `/design-shotgun` | AI-slop / visual QA |
| Reviewer | `/review` (pre-landing diff) · `/codex` (2nd opinion) | Code review |
| Chief Security Officer | `/cso` | OWASP + STRIDE, daily/comprehensive modes |
| QA Lead | `/qa` (test+fix) · `/qa-only` (report) · `/browse` | Browser E2E |
| Release Engineer | `/ship` (PR) · `/land-and-deploy` · `/setup-deploy` | Commit/PR/deploy |
| Health/Quality | `/health`, `/review` | Composite quality score |

GitNexus: CLI at `C:\nvm4w\nodejs\gitnexus.ps1`; MCP `mcp__gitnexus__*` connected. `gitnexus setup` run (configured Claude Code MCP + hooks + 7 skills). Reindex command in this repo: `gitnexus analyze --skills` (run after scaffold + each phase). `gitnexus status`/`list`/`context`/`impact`/`query` for context.

**Autonomous-run note on personas:** the gstack `/plan-*` and `/qa` personas are interactive (they ask the user questions and, for QA, need a live deployment). This run is autonomous with the user away, and the PRD is already decision-complete (scope is LOCKED — re-opening it via a scope-expansion persona would violate §2 + DECISIONS "do not re-open"). So I apply each persona's **checklist/discipline inline** and record the result here, rather than blocking on interactive prompts. `/cso` and `/review` can run largely autonomously and are invoked at the gates.

### 2026-06-04 — Eng-Manager architecture lock (Phase 1 = Build Prompts 1–8)

Applied `/plan-eng-review` discipline to the decision-complete PRD. No scope changes (locked). Decisions:

- **App structure** (Next.js 14 App Router, `src/`):
  - `src/app/(auth)/` — login, signup, forgot/reset password, invite-accept
  - `src/app/(app)/` — authed shell with Buy/Sell mode toggle: dashboard, catalog, auctions (buyer), requests (seller), notifications, settings/profile, members (admin)
  - `src/app/operator/` — gated operator console
  - `src/app/(legal)/` — privacy + T&C placeholder pages (flagged for legal review)
  - `src/app/api/` — Route Handlers: `cron/*` (auction-close, stage2-timers, awaiting-decision-cap), webhooks
  - `src/lib/` — `db/` (Drizzle schema+client), `audit.ts`, `gst/` (provider interface + Mock), `cas/` (PubChem resolver + cache), `auth/`, `email/` (Resend), `ranking.ts`, `validation/` (zod schemas), `supabase/` (server/client/service)
  - `src/lib/__tests__/` — Vitest unit tests for pure logic
- **Key seams (interfaces so vendors swap without touching app code):**
  - `GstVerificationProvider` → `MockGstProvider` (env `GST_PROVIDER=mock`)
  - `CasResolver` → PubChem PUG-REST + `cas_cache` table (cache-first)
  - `lib/audit.ts` `recordAudit()` — single choke point; EVERY mutation calls it
  - `lib/email` — Resend; in dev with no key → log-to-console transport
- **Blind-bidding privacy = defense in depth:** (1) Postgres RLS as the hard guarantee (Prompt 7), (2) app-layer query scoping + DTO masking so the server never selects competitor identity/price in blind mode. Both tested with a two-company fixture.
- **Timers are data-driven** (`closes_at`, `stage2_closes_at` columns) evaluated by idempotent Vercel Cron routes — never in-memory — so deploys/outages never lose an auction. Cron routes guarded by `CRON_SECRET`.
- **Money/quantity:** store as Postgres `numeric`; handle in app as strings → `decimal.js`-style care (no float math on rates). Rank by `stage1_total` (lower wins; tie → earlier `created_at`).
- **Test strategy (≥35%):** concentrate on pure logic that needs no DB — ranking/tie-break, Ex-Works freight zeroing, GSTIN→PAN extraction + validation, CAS CID dedup + 0/1/many branching, whole-token targeting match, Stage-2 price-drop lock, super-comparison lower-of rule. These encode the non-negotiables, so they are the highest-value tests.
- **Scope reconciliation (logged so future-me doesn't trip):** PRD §10 lists Stage-2 / leaderboard / export under "Phase 2", but CLAUDE.md §6 + Build-Prompts define **Phase 1 = Prompts 1–8**, which INCLUDES Stage-2 single-round counter (P5) + leaderboard + export (P6). I build those. Hard fences NOT built: partial bids, AI feed, proactive-share *negotiation* (the share schema/stub may exist but no negotiation UI), web push, SMS, 2FA, reputation-beyond-completion-score, multi-GSTIN rollup, multi-round counters.

### 2026-06-04 — Prompt 1 shipped (scaffold + schema + auth)

- **Scaffold:** manual Next.js 14.2.35 (App Router, TS strict, `src/`) instead of interactive `create-next-app`/`shadcn init` — more reliable in a non-empty autonomous dir. Bumped Next 14.2.13→14.2.35 (cleared the Dec-2025 security advisory while staying on the locked Next-14 line).
- **UI:** shadcn-style primitives written by hand (button/input/card/badge/alert/select/checkbox/table/etc.) using CSS-vars + `cva` + `cn`. Interactive bits (select, checkbox) are styled **native** elements — avoids a heavy Radix dependency tree. Faithful to shadcn's copy-in philosophy.
- **Data access architecture (important):** typed **Drizzle over `DATABASE_URL`** is the trusted server path; every server action authenticates via Supabase, loads the app `users` row, then runs **explicitly company-scoped** queries (app-layer authz primary). **Supabase RLS hardens the anon/PostgREST surface** (Prompt 7) = defense in depth. Drizzle client is lazy (Proxy) so `next build` never needs `DATABASE_URL`.
- **Auth:** Supabase email/password. Signup = GST verify (mock) → `auth.admin.createUser` (email auto-confirmed for the mock/dev build; flip "Confirm email" on in prod) → company + admin user (both capabilities) → session. Password reset uses `admin.generateLink` + **Resend** (keeps email on one vendor) via `/auth/callback`. Login blocks `disabled` users.
- **Schema:** 15 tables (added `operators` for platform staff — not company members; and `reports` for the bad-actor moderation queue — both needed by Prompt 8; logged here). `bids` has **no partial-qty column by design**. Money/qty = `numeric`. Migration `drizzle/0000_last_husk.sql`. RLS-enable SQL in `supabase/01_enable_rls.sql` (also `revoke update,delete on audit_log` for append-only at the DB level).
- **Tests:** 26 unit tests green on the pure non-negotiables (Ex-Works zeroing, Stage-2 price-drop lock, tie-break ranking, lower-of super-comparison, whole-token targeting, GSTIN/PAN + checksum, password policy).
- **Email verification / phone OTP (FR-1.4):** email-link verification is delegated to Supabase's "Confirm email" toggle (auto-confirmed in the mock build for testability). **Phone OTP at signup is deferred** — it needs an SMS provider, and SMS is a Phase-2 fence (DECISIONS). Phone is captured now. Not a blocker; documented here.
- **Verified:** `npm run typecheck`, `npm run build` (16 routes), `npm run test` all green. Runtime signup→login→logout needs live Supabase keys (documented in README); the flow is fully wired.
- **Persona pass:** applied Reviewer/Designer discipline inline (strict TS no-any, consistent design tokens, no AI-slop, accessible native controls). `/cso` + `/review` reserved for the explicit gates (after P4, P7) per §9 autonomous-run note.

### 2026-06-04 — Prompt 2 shipped (onboarding + members + catalog/CAS)

- **CAS resolver** (`lib/cas/`): cache-first (`cas_cache`), then PubChem `name/<cas>/cids` + `cid/<cids>/property/Title`, dedup CIDs, classify 0/1/many. Never throws — a flaky/slow PubChem (7s timeout) degrades to `not_found` (manual entry). Pure `parse.ts` (dedup, classify, CAS check-digit) unit-tested.
- **Onboarding** is now two-step: Verify GSTIN → render the **read-only** fetched legal name + address → confirm + set password + T&C. `signUpAction` re-verifies server-side (don't trust the client preview).
- **Members:** invite via `supabase.auth.admin.generateLink({type:'invite'})` + **Resend** email; member sets password at `/accept-invite` (top-level route) which flips status invited→active and stamps T&C/DPDP consent. Capability toggles (admin). **Disable = mandatory reassign**: `/members/[id]/disable` lists owned catalog items + live auctions + active bids and forces picking an eligible colleague (admin or both-caps) before disabling; last-active-admin is protected.
- **Catalog:** add with CAS-resolve (0/1/many UI), N/A mixture free-text, roles (mfr/dist/trader), grade (+tooltips), min purity. Cross-user uniqueness `(company, cas, profile)` → on collision show the owner (name/designation/team/email) + **Request transfer** (notifies owner + admins, audited). Edit + delist (delist **blocked** if the CAS backs a live auction/active bid).
- **Drizzle enum typing gotcha (logged):** deriving `z.enum(arr)` from `Array.map(...)` loses literal types → insert/`.set()` reject the column. Fix = use `as const` literal tuples for enum value lists. Applied in catalog actions.
- **Verified:** typecheck + build (20 routes) + 29 tests green. Runtime CAS→Toluene + invite email need live Supabase/network (logic + CHECK satisfied in code).

### 2026-06-04 — Prompt 3 shipped (auctions + targeting + network)

- **Auction create** (`/auctions/new`): CAS-resolve reused from catalog, mixture toggle, qty+unit, min purity, packing, delivery address (defaults to registered), logistics basis, supplier filter, spec upload (Supabase Storage `auction-files`, PDF/JPG/PNG ≤10MB, private bucket + signed URLs), remarks, IST closing (6h–14d), privacy + blind. **Gated on `verificationStatus==='verified'`.** Empty-network safeguard blocks Registered-Only with 0 active partners.
- **Timer logic** (`lib/auction/timing.ts`) pure + tested: 6h–14d bounds, one ≤48h extension, Stage-2 24h + final-2h urgency window. IST datetime-local parsed via `istLocalToDate` (`+05:30`).
- **Targeting engine** (`lib/targeting/run.ts`): CAS exact match (SQL) or mixture whole-token match (pure `isQualifiedSeller`), role-intersection with supplier filter, **excludes sellers who blocked the buyer** (all/this-CAS), Registered-Only restricts to active partners. Dedups per company → in-app notification + Resend email to the catalog owner.
- **Network** (`/network`): register partner by GSTIN+CAS → active if on platform (notifies their admins for **DPDP consent / decline**) else pending placeholder + optional invite email (growth loop). Incoming "added-you" list with Decline. Remove partner.
- **Auctions list/detail**: status-grouped folders, blind badge, bid count, extend/cancel (lifecycle), buyer spec download via signed URL. Full Stage-1 bid review deferred to P5 (`/auctions/[id]/review`).
- **Storage access model:** private bucket; server mints 5-min signed URLs only after an authz check (buyer here; accepted sellers in P4). No public reads, no anon storage policies.
- **Verified:** typecheck + build (28 routes) + 34 tests green.

### 2026-06-04 — Prompt 4 shipped (Stage-1 blind bidding) + CSO gate

- **Targeting now seeds per-seller "request" rows** (placeholder `bids`, `gateState='notified'`, no pricing) so each seller has a durable inbox carrying gate state. A real quote = `stage1Total IS NOT NULL`; bid-count queries filter on that so placeholders don't inflate counts.
- **Seller gate** (`/requests/[id]`): pricing locked + buyer masked ("A verified buyer") until **Accept & Quote**; then buyer legal name + acting user + designation revealed and spec downloadable (signed URL, accepted-only). Ignore → collapsible list + Un-ignore (while open). Block this CAS / all → `blocks` row + gate `blocked`.
- **Bid form** (full qty only — no partial field): basic + freight → live total; **Ex-Works hides freight + forces 0**; Delivered requires it. Payment terms + lead time on the form. COA upload required unless "COA on dispatch (make-to-order)". Submit / revise / **withdraw** (status→withdrawn, **retained** in audit).
- **Blind rank** = server-computed (`getMyRankAction`): competitor totals fetched server-side, only the seller's own `#rank` + count returned. Tie-break by earlier `created_at`. Client `RankWidget` polls (12s) + best-effort Supabase Realtime trigger (activates once Prompt-7 RLS allows seller change-events). **No competitor price/identity ever reaches the client.**
- **Cron close** (`/api/cron/close-auctions`, Bearer `CRON_SECRET`, idempotent): past-deadline active auctions → `awaiting_decision` (notify buyer, expire un-quoted placeholders) or `unsuccessful` (notify + Clone). `vercel.json` cron every 5 min.
- **CSO pass (daily, OWASP+STRIDE) on the bidding surface:** No 8+/10 exploitable findings. Verified app-layer blind-privacy holds (rank server-only, identity masked, file authz, no XSS sink, only raw `sql` is a column-ref count subquery, cron guarded). Residual = **missing-hardening scheduled for Prompt 7**: Postgres RLS policies + the two-company anon proof, rate limiting, virus scan, explicit 12h session. RLS currently enabled default-deny.
- **Verified:** typecheck + build (32 routes) + 34 tests green.

### 2026-06-04 — Prompt 5 shipped (Stage-2 single-round counter)

- **Buyer review** (`/auctions/[id]/review`): Stage-1 bids sorted by `stage1_total` asc (numeric column → numeric sort), auction average shown, full seller corporate + contact revealed (post-close), COA download / make-to-order flag. Effective rate column = lower of S1/S2.
- **Launch Stage-2** (`launchStage2Action`): one counter rate → `stage='stage2'`, `stage2_closes_at = now+24h`, blasts in-app + Resend (`counterReceivedEmail`) to ALL Stage-1 participants (quoted bids). Single round only.
- **Seller response** (`stage2RespondAction`): Accept (takes the target) / Reject (Stage-1 stands) / Final (alt rate). **Price-drop lock** via `isValidStage2Rate` — a Final rate may never exceed the seller's Stage-1 total (server-rejected). Rendered in `/requests/[id]` when stage2 window open.
- **All-reject / no-response fallback is automatic:** non-responders keep `stage2_rate = null`; `effectiveTotal()` (lower-of) leaves Stage-1 standing — no auction ever dies on a failed negotiation.
- **Schema:** added `auctions.stage2_urgency_sent` (migration `0001`) so the **final-2h urgency email fires exactly once**. Cron `/api/cron/stage2-timers` sends `stage2UrgencyEmail` (₹ rate in the SUBJECT, FR-6.3) to non-responders inside the 2h window, then flips the flag. Stage-2 expiry needs no processing (lower-of handles it). Added to `vercel.json`.
- **Verified:** typecheck + build (34 routes incl. 2 cron) + 34 tests green. Stage-2 price-drop + lower-of already covered by `pricing.test.ts` / `ranking.test.ts`.

### 2026-06-04 — Prompt 6 shipped (closure, leaderboard, DCR, disputes, export)

- **Super-comparison leaderboard** (review page): rank by `effectiveTotal` (lower of S1/S2), avg shown, full seller corporate + contacts. Per-card **Confirm deal** + **Block seller (this CAS)** while `awaiting_decision`; 🔴 Blocked tag for blocked sellers (bids retained).
- **Deal Confirmation Record** (`confirmDealAction`, transactional): winner `won`, others `lost`, `deals` row, auction `closed`. **Both parties emailed identical confirmations** (`dealConfirmationEmail`) stating *mutual intent under signup T&Cs* — the word "legally binding" appears NOWHERE; every "enforceable" mention explicitly negates it (grep-verified). `/deals/[id]` renders the record (buyer or seller of it).
- **Disputes** (`raiseDisputeAction`, either party): inserts `disputes` row + flips deal→`disputed` + audits `DealDisputed`. **Append-only — the deal is never deleted.** Optional evidence upload.
- **Export** (`/api/export/auction/[id]?format=pdf|csv`): buyer sees all bids, a participant seller sees only their row, anyone else 403. PDF via `pdf-lib` (standard fonts can't encode ₹ → amounts labelled `INR`). Audited.
- **Awaiting-decision cap** cron (`/api/cron/awaiting-cap`, daily 02:00): `awaiting_decision` >14d → `closed` (bids preserved). vercel.json updated (3 crons).
- **Verified:** typecheck + build (38 routes) + 34 tests green.

### 2026-06-05 — Prompt 7 shipped (RLS + DPDP + notifications + security) + CSO gate #2

- **RLS** (`supabase/02_policies.sql`): SELECT policies on all 15 tables for `authenticated`, plus `security definer` helpers `app_company_id()`/`app_is_operator()`/`app_gstin()`. Encoded guarantees: **`bids_select` → a seller reads only its own bid** (never a competitor's); **`companies_select`/`users_select` → a seller's identity is visible to a buyer only after Accept (`gate_state='accepted'`) or close**; `audit_select` operator-only; UPDATE/DELETE never granted (writes go via service role). RLS hardens the anon/PostgREST + Realtime surface; the Drizzle/`DATABASE_URL` server path stays the trusted app layer.
- **Two-company proof:** `scripts/rls-two-company-test.ts` — signs in as two sellers via the anon client and asserts A cannot read B's bid/company/users + audit_log is unreadable/immutable. Runs against a live Supabase (documented setup).
- **Notification center** (`/notifications`): durable list, read/unread, mark-one + mark-all, typed payload→title/href mapping, header bell unread count (already wired in app layout).
- **DPDP:** `/api/export/me` JSON export **scoped to the requester's own profile** (CSO tightening — was dumping all members' PII) + company business records; account-deletion request soft-disables + stamps `deletion_requested_at`, blocks last-active-admin, legal-hold note; marketing opt-out toggle; consent surfaced.
- **Security baseline:** in-memory rate limiter (`lib/ratelimit.ts`) — login 5/15min, auction 20/company/day (Upstash noted for prod); `completion_score` −10 via awaiting-cap cron when a buyer never confirms, surfaced to sellers as a colour-coded badge.
- **CSO #2 (OWASP+STRIDE):** no 8+/10 findings. Verified: RLS isolation logic, export authz (`getCurrentUser` 401 + company scope), deletion guard, audit immutability, no `any` types (grep-clean), no XSS sinks. The one applied fix = export-me PII scope.
- **Verified:** typecheck + build (25 routes, **0 warnings**) + 34 tests green.

### 2026-06-05 — Prompt 8 shipped (operator console + dashboards + PWA) + QA gate

- **Operator console** (`/operator/*`, gated by `requireOperator`, separate layout — operators are NOT company users): analytics dashboard (companies, auctions, quoted bids, deals, completion rate, median bids/auction, median time-to-close, rough burn); dispute queue + resolve; moderation queue; companies list with **manual GST override** (verify/reject pending) + **suspend/reinstate** (suspended companies hit `/blocked?reason=suspended`). Operators sign in at `/login` → routed to `/operator`.
- **Report a bad actor** (`reportActorAction` + `ReportButton`): seller→buyer on the request page (post-accept), buyer→seller on the review leaderboard → feeds the moderation queue. Audited.
- **Clone & relist** (`CloneButton`) on unsuccessful/cancelled auction detail → prefills `/auctions/new?clone=`.
- **PWA**: real icons generated by `scripts/gen-icons.mjs` (dependency-free PNG encoder) → `public/icons/icon-{192,512}.png`; manifest + SW already wired. Responsive throughout (max-w containers, fl-wrap, mobile nav scroll).
- **Ops**: `scripts/seed-operator.ts` (seeds operators from `OPERATOR_EMAILS`, prints temp passwords). `OPERATIONS.md` — env, DB/storage setup order, cron table, GST mock→Surepass swap, Resend domain, RLS test, full E2E smoke checklist.
- **QA gate (runtime smoke, both P6 + P8):** public pages 200; authed + all 4 operator routes 307-gate to login; cron 401 without secret; manifest + icons 200. Full data-flow E2E needs live Supabase (scripted in OPERATIONS §7).
- **Verified:** typecheck + build (29 routes, 0 warnings) + **42 tests** (9 files) green.

### 2026-06-05 — Phase 1 complete

All 8 build prompts shipped + both CSO gates + QA smoke. Builds clean, deploy-ready. Phase-2/3/4 fences held: no partial bids, no AI feed, no proactive-share *negotiation* UI (schema stub only), no web push/SMS/2FA, no reputation beyond completion-score, no multi-GSTIN rollup, no multi-round counters. Remaining to go live = the user's Supabase + Vercel + Resend keys (README + OPERATIONS).

### 2026-06-12 — User-directed batch: UX bugs, emails, retro-targeting, 3-tier pricing, Service Providers Hub

User-mandated changes (product owner instructions; §2 fences NOT crossed — bids stay full-quantity single-winner, Stage-2 stays single-round):

- **CAS Enter-to-resolve:** Enter in the CAS field now triggers Resolve (was submitting the half-filled form). Auction + catalog forms.
- **Mode toggle → dashboard:** switching Buy/Sell always lands on `/dashboard` (was staying on the current page, stranding users on wrong-mode screens).
- **Targeting blocks now bidirectional:** `runTargeting` previously only excluded sellers who blocked the buyer; now ALSO excludes sellers the buyer blocked (the "muted for future requirements" promise was unenforced).
- **Retro-match (`retroMatchSalesItem`):** adding a SALES catalog item now scans ACTIVE auctions and pulls the seller into any they qualify for (same rules: CAS/token, supplier filter, blocks both ways, Registered-Only, suspended-skip; idempotent via the bids unique constraint). Catalog page shows a "matched N live requirements" banner via `?matched=N`.
- **Emails:** root cause of "no emails" was no `RESEND_API_KEY` in the prod env. Key now in `.env.local`; transport logs failures loudly. NOTE: with `onboarding@resend.dev`, Resend test mode only delivers to the account owner's inbox — verify a domain + set `EMAIL_FROM` for real recipients. Key must also be set in Vercel env.
- **3-tier bid pricing (user decision):** Total = MATERIAL (basic) + TRANSPORT (freight) + TAX (per-unit, ≥0, default 0; `bids.stage1_tax`). Ranking/leaderboard/export always use the FULL total. Ex-Works still zeroes freight only.
- **Stage-2 on the MATERIAL rate (user decision):** `auctions.stage2_target` + `bids.stage2_rate` are now material-basis; each seller's S1 freight+tax carry over (`pricing.stage2Total`); price-drop lock = final material ≤ S1 material; effective = min(S1 total, S2 material + carryover). Single round preserved.
- **Service Providers Hub (new module, user spec):** open-identity (NO blind) transport + packing-material marketplace. `service_provider_profiles` (company opt-in: vehicle classes / packing types), `service_requests` (transport: material, gross kg, lot kg, vehicle checkboxes, pickup/drop; packing: type/condition/pieces/spec/weight/basis; both: baseline payment terms + description), `service_quotes` (rate ₹/kg or ₹/piece + ABSOLUTE tax ₹; Total = rate×qty + tax; optional alternative-payment-terms text; unique per provider+request). Instant email broadcast to matching providers on publish; accept → others declined + request closed; dual-sided Service History at `/services/history`. Routes under `/services/*`; nav + dashboard cards in both modes; RLS in `supabase/04_services.sql` (profiles+requests open-read to authenticated; quotes readable only by provider + needer + operator). All mutations audited.
- Migration `drizzle/0002_worthless_doctor_faustus.sql` (additive only) applied to live Supabase + RLS. 59 unit tests green (8 pricing incl. tax + material lock, 6 services totals/matching).
- **(later same day) Tie-break fix via multi-user sim:** placeholder bid rows are batch-created at targeting, so `created_at` couldn't break price ties → `submitBidAction` re-stamps `created_at` at the FIRST quote (revisions keep it); review leaderboard + export gained the same tie-break. Found by `scripts/sim-multiuser.ts` (11 sellers, 25 live-DB assertions + browser verification; repeatable phase1/`--phase2`).
- **(later same day) Service Providers Hub spec v2 — provider accounts:** signup now asks "We trade chemicals" vs "We provide services"; provider path = same GST verify, `canBuy/canSell=false`, admin user, inactive provider-profile stub, lands on `/services/providers?welcome=1` to pick vehicle/packing types. Provider-only UX: `/dashboard` redirects to `/services` (Active Requests Board), nav = Services hub + Service history (+ Members), needer CTAs hidden. **Deviation recorded:** spec §1's emailed temp-password + forced first-login change is DEFERRED until a verified Resend domain exists (test mode can't deliver to arbitrary inboxes); password is chosen at signup instead — same security outcome, no email dependency. Google Places (spec §3): `PlacesInput` autocomplete on transport pickup/drop activates with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (user must provision; Places API + Maps JS API, referrer-restricted); server hard-rejects un-picked addresses only when the key is set; `pickup/drop_place_id` stored (migration `0003`); free Google Maps directions link always shown on transport requests.

## 10. Blocked / needs human (append-only)

_(empty — record real blockers here; do NOT resolve by violating §2)_

---

## 11. Things that need a human, not code (don't try to "fix" these)

1. T&C legal review (Deal Confirmation Record — governing law, arbitration seat). Use a placeholder T&C page; flag it.
2. Real GST vendor key (Surepass) — keep `GST_PROVIDER=mock` until provided.
3. News licensing (Phase 4 only).
4. Replacing starter success-metric targets with real data.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Chemical Auction App** (798 symbols, 2056 relationships, 57 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/Chemical Auction App/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Chemical Auction App/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Chemical Auction App/clusters` | All functional areas |
| `gitnexus://repo/Chemical Auction App/processes` | All execution flows |
| `gitnexus://repo/Chemical Auction App/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the App area (25 symbols) | `.claude/skills/generated/app/SKILL.md` |
| Work in the Catalog area (19 symbols) | `.claude/skills/generated/catalog/SKILL.md` |
| Work in the Requests area (19 symbols) | `.claude/skills/generated/requests/SKILL.md` |
| Work in the Email area (18 symbols) | `.claude/skills/generated/email/SKILL.md` |
| Work in the Auth area (18 symbols) | `.claude/skills/generated/auth/SKILL.md` |
| Work in the Gst area (18 symbols) | `.claude/skills/generated/gst/SKILL.md` |
| Work in the [id] area (18 symbols) | `.claude/skills/generated/id/SKILL.md` |
| Work in the Operator area (14 symbols) | `.claude/skills/generated/operator/SKILL.md` |
| Work in the Notifications area (13 symbols) | `.claude/skills/generated/notifications/SKILL.md` |
| Work in the Auctions area (11 symbols) | `.claude/skills/generated/auctions/SKILL.md` |
| Work in the Cas area (11 symbols) | `.claude/skills/generated/cas/SKILL.md` |
| Work in the Scripts area (10 symbols) | `.claude/skills/generated/scripts/SKILL.md` |
| Work in the Auction area (8 symbols) | `.claude/skills/generated/auction/SKILL.md` |
| Work in the Export area (8 symbols) | `.claude/skills/generated/export/SKILL.md` |
| Work in the Members area (8 symbols) | `.claude/skills/generated/members/SKILL.md` |
| Work in the (auth) area (7 symbols) | `.claude/skills/generated/auth-2/SKILL.md` |
| Work in the Cluster_4 area (4 symbols) | `.claude/skills/generated/cluster-4/SKILL.md` |

<!-- gitnexus:end -->
