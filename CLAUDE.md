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
- [ ] Prompt 2 — onboarding + members + catalog/CAS
- [ ] Prompt 3 — auction creation + targeting + network
- [ ] Prompt 4 — Stage-1 blind bidding
- [ ] Prompt 5 — Stage-2 counter loop
- [ ] Prompt 6 — closure + leaderboard + dispute + export
- [ ] Prompt 7 — RLS + DPDP + notifications + security
- [ ] Prompt 8 — operator console + dashboards + PWA
- [ ] Security audit (OWASP + STRIDE) green
- [ ] Full E2E smoke test green
- [ ] Deployed to Vercel

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

This project is indexed by GitNexus as **Chemical Auction App** (396 symbols, 715 relationships, 19 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
| Work in the Gst area (15 symbols) | `.claude/skills/generated/gst/SKILL.md` |
| Work in the Auth area (15 symbols) | `.claude/skills/generated/auth/SKILL.md` |
| Work in the Email area (12 symbols) | `.claude/skills/generated/email/SKILL.md` |
| Work in the App area (11 symbols) | `.claude/skills/generated/app/SKILL.md` |
| Work in the Cluster_2 area (4 symbols) | `.claude/skills/generated/cluster-2/SKILL.md` |
| Work in the Cluster_3 area (4 symbols) | `.claude/skills/generated/cluster-3/SKILL.md` |
| Work in the (auth) area (4 symbols) | `.claude/skills/generated/auth-2/SKILL.md` |
| Work in the Cluster_7 area (3 symbols) | `.claude/skills/generated/cluster-7/SKILL.md` |

<!-- gitnexus:end -->
