# DECISIONS.md — The 24 Closed Decisions (authoritative)

> When the PRD prose and this table seem to differ, **this table wins** for the *decision*; the PRD wins for the *why*. Do not re-open any of these during the Phase-1 build.

| # | Question | ✅ Decision | One-line why |
|---|---|---|---|
| 1 | Partial bids vs single-winner | **Drop partials; full-qty, single winner** | Per-unit ranking across different qtys is incoherent; multi-award is a different, unproven product |
| 2 | Cost / burn | **Free to users; track burn/company; cheap tiers; defer AI** | No revenue yet; minimize fixed cost until liquidity proven |
| 3 | GST vendor + multi-GSTIN | **Surepass (GSTZen fallback) via adapter; each GSTIN = own account; store PAN** | Each GSTIN is legally distinct; rollup is later |
| 4 | Role model | **One user: can_buy/can_sell flags + mode toggle; Admin both** | Separate logins = pure friction for firms that buy & sell |
| 5 | "Legally binding" | **Deal Confirmation Record + signup T&Cs** | Email ≠ enforceable contract; overclaiming = liability |
| 6 | "Department" | **Killed; replaced by `team` label** | Undefined concept; pain met by one-CAS-per-user rule |
| 7 | Quality grades | **Pure / Distilled / Trade defined + min_purity %** | Purity % is the real discriminator |
| 8 | PubChem handling | **Cache + 0/1/many fallback + manual override** | Free but flaky/rate-limited; caching cuts calls ~90% |
| 9 | Ex-Works ↔ freight | **Ex-Works hides+zeroes freight; Delivered requires it** | Seller freight is meaningless when buyer arranges pickup |
| 10 | Payment terms / lead time | **Captured on the bid form** | Can't display what was never entered |
| 11 | Counter-offer scope | **Single round, all participants** | Multi-round = abuse-prone; defer |
| 12 | Auction duration | **6h–14d, IST, one ≤48h extension** | Bounds protect both sides |
| 13 | Ties / withdrawal | **Earlier timestamp wins; withdrawal allowed, audit-retained** | Deterministic; history never erased |
| 14 | Partner not on platform | **Invite flow + pending placeholder; skipped in Registered-Only** | Dead-end → growth loop |
| 15 | Units | **kg / MT / L per auction; bids inherit unit** | Chemicals trade in MT/L |
| 16 | Auth / recovery / offboarding | **Full flows; mandatory catalog reassignment on offboarding** | Orphaned catalog breaks the one-CAS rule |
| 17 | DPDP compliance | **Consent, privacy policy, export/delete, breach log, retention** | Law (Rules 2025, deadline 2027) |
| 18 | Notifications infra | **Resend email + in-app center v1; push/SMS Phase 2** | Durable inbox beats transient pop-ups |
| 19 | Operator tooling | **Moderation, dispute queue, GST override, suspend, analytics** | Needed from day one of real users |
| 20 | Market feed | **Phase 4, batch-tagged, not real-time LLM** | Unbounded per-user LLM cost; it's a nicety |
| 21 | Tech stack | **Next.js + Supabase + Resend on Vercel** | Collapses auth/DB/storage/realtime |
| 22 | Reputation | **Completion-score only v1; full reputation Phase 3** | Block + score cover the gap cheaply |
| 23 | In-app messaging | **Deferred** | Negotiation is structured, not chat |
| 24 | Zero-bid auction | **Auto-Unsuccessful + Clone & relist** | Re-run is the key retention moment |

## Phase fences (do NOT build these in the Phase-1 run)
- Partial bids + multi-award (Phase 3, gated on data)
- AI market feed (Phase 4)
- Proactive-share full negotiation, web push, SMS, 2FA, reputation, multi-GSTIN rollup, multi-round counters (Phase 2/3)
