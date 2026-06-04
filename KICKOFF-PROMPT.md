# KICKOFF PROMPT

> Open Claude Code **inside this folder**, then paste the block below as your first message. That's it — it will read its own memory, set up the skills, and build Phase 1 autonomously, gate by gate.

---

```
You are building the B2B Chemical Auction Platform in this folder. Work autonomously through all of Phase 1, then stop and report.

STEP 0 — ORIENT (do this before any code):
1. Read CLAUDE.md in full. It is your persistent memory and governs everything.
2. Read, in order: docs/Chemical-Auction-PRD-v1.0-BuildReady.md, docs/Chemical-Auction-Build-Prompts.md, docs/DECISIONS.md, docs/SKILLS-INTEGRATION.md.
3. Memorize the 9 non-negotiable decisions in CLAUDE.md §2. The three biggest traps: NO partial-quantity bids (full quantity, single winner), NEVER label anything "legally binding" (it's a "Deal Confirmation Record"), and audit_log is append-only.

STEP 1 — SET UP SKILLS (per docs/SKILLS-INTEGRATION.md):
4. Run `gitnexus setup` once. List your installed gstack slash commands and your GitNexus CLI commands; map each gstack role (Eng Manager, Designer, Reviewer, Chief Security Officer, QA Lead, Release Engineer) to its actual command name and record the mapping in CLAUDE.md §9.
5. Use gstack's CEO/Eng-Manager persona once on the PRD to confirm scope and lock the Phase-1 architecture before writing code.

STEP 2 — BUILD (execute Build Prompts 1→8 in docs/Chemical-Auction-Build-Prompts.md, in order):
6. Internalize Prompt 0 (master context) — it already matches CLAUDE.md.
7. For EACH prompt 1 through 8, run the per-prompt loop from docs/SKILLS-INTEGRATION.md:
   lock scope → build exactly that slice → pass the prompt's ### CHECK block (do not proceed until green) → Designer + Reviewer pass → write/run tests (~35% coverage) → `gitnexus analyze --skills` to reindex → commit via the Release persona → tick CLAUDE.md §8 and append any undocumented choices to §9.
8. Run the Chief Security Officer (OWASP + STRIDE) pass after Prompt 4 and after Prompt 7. Prove the blind-bidding RLS with a two-company test: seller A must NOT read seller B's bid; a buyer must NOT see seller identity before that seller Accepts.
9. Run the QA Lead browser pass after Prompt 6 and after Prompt 8 (full E2E: signup → catalog → auction → bid → Stage-2 → confirm → dispute → operator resolve).

RULES:
- Build ONLY Phase 1 (Prompts 1–8). Do NOT build any Phase 2/3/4 item — especially partial bids, AI market feed, proactive-share negotiation, web push, 2FA, or reputation. They are deliberately deferred (see docs/DECISIONS.md "Phase fences").
- Keep GST_PROVIDER=mock; use MockGstProvider. Use placeholder Privacy Policy / T&C pages and flag them as needing legal review.
- If you hit a genuine PRD contradiction that blocks you, record it in CLAUDE.md §10 and pick the option that honors §2 — never resolve it by violating a non-negotiable decision.
- Keep CLAUDE.md and .env.example current as you go. Commit at every phase gate.

WHEN DONE:
- All of CLAUDE.md §8 checked, security audit green, full E2E green, app builds clean and is ready to deploy to Vercel.
- Post a short final report: what shipped, the gstack/GitNexus command mapping you used, anything logged in §9/§10, and the deploy steps.

Begin with STEP 0 now.
```

---

## What's in this folder

```
CLAUDE.md                                   ← Claude Code auto-loads this (project memory)
KICKOFF-PROMPT.md                           ← this file (paste the block above)
docs/
  Chemical-Auction-PRD-v1.0-BuildReady.md   ← WHAT to build (decision-complete PRD)
  Chemical-Auction-Build-Prompts.md         ← ORDER to build in (9 staged prompts)
  DECISIONS.md                              ← the 24 closed decisions (authoritative)
  SKILLS-INTEGRATION.md                     ← how to use gstack + GitNexus
  archive/
    v0.1-original-analysis-PRD.md           ← the original analysis PRD (reference only)
```

## Before you run (2-minute checklist)
- [ ] gstack installed (its slash commands show in `/help`).
- [ ] GitNexus installed (`gitnexus` CLI available).
- [ ] A Supabase project created; keys ready for `.env`.
- [ ] A Resend API key (or run email in dev/log mode first).
- [ ] Open Claude Code in THIS folder, paste the kickoff block, let it run.
