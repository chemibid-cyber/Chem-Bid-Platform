# SKILLS-INTEGRATION.md — How to use gstack + GitNexus on this build

You (Claude Code) have two skill systems installed. They do different jobs. Use both.

- **GitNexus** = the **context layer**. A code-intelligence engine that builds a knowledge graph of the repo and generates per-module `SKILL.md` files, so you keep an accurate architectural view and stop breaking call chains / shipping blind edits as the codebase grows.
- **gstack** (Garry Tan's, ~23 slash-command "skills") = the **process layer**. A virtual startup team — CEO, Eng Manager, Designer, Reviewer, QA Lead, Chief Security Officer, Release Engineer — each a specialist persona with its own checklist.

> **Discover exact names first.** The command names below are roles, not guaranteed literals. Run `/help` (or list your installed slash commands and your GitNexus CLI `--help`) at the start and map each role to the actual command you have. Record the mapping in `CLAUDE.md` §9.

---

## One-time setup (before Prompt 1)

1. `gitnexus setup` — writes the MCP config so graph context is available to you. Run once.
2. List your gstack commands; note the real names for: architecture/scope, design review, code review, security audit, QA/browser test, release/PR.
3. (gstack) Run the **CEO / Eng Manager** persona once on the PRD to confirm scope and lock the Phase-1 architecture before writing code.

---

## The per-prompt loop (apply to each of Build Prompts 1–8)

```
┌─ 1. (gstack: Eng Manager) Lock scope for THIS slice. No future-phase work.
├─ 2. Build exactly what the prompt specifies.
├─ 3. Run the prompt's ### CHECK block. Must pass before continuing.
├─ 4. (gstack: Designer) Review any new UI for AI-slop / inconsistency.
├─ 5. Write + run tests (≥35% coverage discipline).
├─ 6. (gstack: Reviewer) Code review; fix findings.
├─ 7. (GitNexus) `gitnexus analyze --skills` → reindex the graph + module SKILL.md.
├─ 8. (gstack: Release Engineer) Conventional commit / open PR.
└─ 9. Update CLAUDE.md §8 checklist + §9 log.
```

---

## Phase-gate special passes

- **After Prompt 4 (bidding) and Prompt 7 (RLS/DPDP):** run the **Chief Security Officer** persona — OWASP Top 10 + STRIDE. The blind-bidding privacy model (a seller must NOT read another seller's bid; a buyer must NOT see seller identity pre-accept) is the highest-risk surface. Verify RLS policies actually enforce it with a two-company test, not just by inspection.
- **After Prompt 6 (closure) and Prompt 8 (final):** run the **QA Lead** persona — open a real browser and walk the full flow: signup → catalog → auction → bid → Stage-2 → confirm → dispute → operator resolve.
- **Before deploy:** security audit green + full E2E green, then **Release Engineer** ships to Vercel.

---

## Precedence rules (important)

1. **Product decisions:** `CLAUDE.md` §2 + `docs/DECISIONS.md` + the PRD **always win**. If a gstack persona suggests a product change (e.g., "add partial bids", "call it legally binding"), reject it — gstack governs *process*, not *product*.
2. **Process/quality:** defer to gstack personas (testing, review, security, release discipline).
3. **Architecture/context:** trust GitNexus's graph over your own memory when locating code or tracing dependencies; reindex after big changes so it never goes stale.

---

## Why both, not one

gstack without GitNexus = great process, but on a 20k-LOC marketplace you'll lose the thread and break call chains. GitNexus without gstack = great map, no disciplined build/review/ship loop. Together: GitNexus keeps you oriented, gstack keeps you rigorous, and the PRD keeps you correct. That combination is what lets this run as a single autonomous session without unraveling.
