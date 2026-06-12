# Test Plan — B2B Chemical Auction Platform

Repeatable QA for the whole app. Status legend:

- ✅ **Verified live** — exercised against the deployed app (`https://chem-bid-platform.vercel.app`) on 2026-06-10.
- 🧪 **Logic unit-tested** — covered by the automated suite (`npm run test`, 42 tests).
- ⏳ **Pending live** — reachable in code + build-verified; not yet click-tested on the live deploy.

## How to run

| Layer | Command |
|---|---|
| Type safety | `npm run typecheck` |
| Unit tests (pure logic) | `npm run test` |
| Production build | `npm run build` |
| RLS two-company proof | `npx tsx scripts/rls-two-company-test.ts` (needs live Supabase) |
| Force-close an auction (QA) | `npx tsx scripts/qa-force-close.ts <auctionId>` then trigger the close cron |
| Inspect auction/deal state (QA) | `npx tsx scripts/qa-check.ts <auctionId>` |

**Test accounts (demo seed):** `buyer@demo.test` / `Demo@1234` (Demo Buyer Chemicals, both caps + admin) · `seller@demo.test` / `Demo@1234` (Demo Seller Organics, carries Toluene CAS 108-88-3) · operator `operator@chemauction.app`.

> **Tester note:** forms use controlled React inputs. Automated harnesses must dispatch real input events (type via keyboard, or set value + dispatch `input`) — setting `.value` alone won't register. Real users typing are unaffected.

---

## A. Automated unit tests (🧪 — `npm run test`, 42 passing)

| Suite | Guards |
|---|---|
| `ranking.test.ts` | lowest total wins; ties → earlier timestamp; lower-of S1/S2 |
| `pricing.test.ts` | Ex-Works zeroes freight; Stage-2 final ≤ Stage-1 (price-drop lock); total = basic + freight |
| `targeting.test.ts` | CAS exact match; mixture whole-token match; role intersection; blocked-seller exclusion |
| `timing.test.ts` | 6h–14d bounds; single ≤48h extension; Stage-2 24h + final-2h window |
| `gstin.test.ts` | GSTIN→PAN extraction; checksum validation |
| `cas/parse.test.ts` | CID dedup; 0/1/many classification; CAS check-digit |
| `auth/password.test.ts` | password policy |
| `auth/mode.test.ts` | Buy/Sell mode resolution from capabilities |
| `gst/mock.test.ts` | mock GST provider shape |

---

## B. End-to-end test cases

### Auth & session
| ID | Steps | Expected | Status |
|---|---|---|---|
| AUTH-1 | Visit `/`, `/login`, `/signup`, `/terms`, `/privacy` logged out | All render 200 | ✅ |
| AUTH-2 | Visit `/dashboard`, `/operator` logged out | 307 → `/login` | ✅ |
| AUTH-3 | Log in with valid creds | Lands on `/dashboard` | ✅ |
| AUTH-4 | Log in with wrong password | Stays on `/login`, destructive Alert shows error | 🧪 (Alert wired, login-form.tsx:23) |
| AUTH-5 | Sign out via account menu | Session cleared; `/dashboard` → `/login` | ✅ |
| AUTH-6 | Forgot password → email link → reset | Reset link sets new password | ⏳ (needs Resend key) |

### Dashboard
| ID | Steps | Expected | Status |
|---|---|---|---|
| DASH-1 | Log in as buyer | "Welcome, Bhavna", Buy mode, stat cards (Active/Awaiting/Deals), quick actions, roadmap "Soon" cards | ✅ |
| DASH-2 | Toggle Buy↔Sell | Stats + quick actions + nav switch to the mode | ✅ |
| DASH-3 | Stat cards reflect real data | Active auctions count matches DB | ✅ (showed 1, then live updates) |

### Catalog
| ID | Steps | Expected | Status |
|---|---|---|---|
| CAT-1 | `/catalog` empty | EmptyState with mode-aware copy + "Add product" | ✅ |
| CAT-2 | Add product, CAS 108-88-3, Resolve | Autofills "Toluene" from PubChem | ✅ (resolver verified on auction form, same code) |
| CAT-3 | Add mixture (N/A) | Free-text name, no CAS required | ⏳ |
| CAT-4 | Delist a product | Styled confirm dialog → product hidden from matching | ⏳ (dialog refactor; build-verified) |
| CAT-5 | Cross-company CAS+profile collision | Shows owner + "Request transfer" | 🧪 (uniqueness logic) |

### Auction creation + targeting
| ID | Steps | Expected | Status |
|---|---|---|---|
| AUC-1 | `/auctions/new`, CAS 108-88-3, Resolve | Product name autofills "Toluene" | ✅ |
| AUC-2 | Fill qty/unit/purity/packing, publish | Redirect to detail, "Published — N qualified seller(s) notified" | ✅ (5000 kg, 1 seller notified) |
| AUC-3 | Targeting matches catalog | Only sellers carrying the CAS get a request | ✅ (seller inbox received it) |
| AUC-4 | Ex-Works basis | Freight field hidden + zeroed | 🧪 |
| AUC-5 | Closing date out of 6h–14d | Rejected with message | 🧪 |
| AUC-6 | Registered-Only with 0 partners | Blocked with safeguard message | 🧪 |
| AUC-7 | Spec sheet upload (PDF/JPG/PNG ≤10MB) | Stored in private bucket; signed-URL download | ⏳ |
| AUC-8 | Extend (≤48h once) / Cancel (styled confirm) | Lifecycle updates; sellers notified | ⏳ |

### Seller request gate (blind privacy)
| ID | Steps | Expected | Status |
|---|---|---|---|
| REQ-1 | `/requests` as notified seller | Request listed under "New" | ✅ |
| REQ-2 | Open request before Accept | Buyer masked "A verified buyer"; pricing locked | ✅ |
| REQ-3 | Accept & Quote | Buyer identity + contact revealed; bid form opens | ✅ |
| REQ-4 | Ignore / Un-ignore | Moves to Ignored; reversible while open | ⏳ |
| REQ-5 | Block this CAS / all | `blocks` row; gate → blocked | 🧪 |

### Bidding (full quantity only)
| ID | Steps | Expected | Status |
|---|---|---|---|
| BID-1 | Bid form has NO partial-qty field | "Submit your bid — full quantity" only | ✅ |
| BID-2 | Enter basic + freight | Live total = basic + freight (₹90.00/kg) | ✅ |
| BID-3 | COA-on-dispatch checkbox | Hides COA upload requirement | ✅ |
| BID-4 | Submit bid | "Bid submitted" + blind rank widget | ✅ |
| BID-5 | Blind rank | Shows only own "#N of M"; no competitor price/identity | ✅ (#1 of 1) |
| BID-6 | Withdraw bid (styled confirm) | Removed from ranking; retained in audit trail | ⏳ (dialog refactor) |

### Close (cron)
| ID | Steps | Expected | Status |
|---|---|---|---|
| CLOSE-1 | Past-deadline auction WITH bids → cron | Status → `awaiting_decision`; buyer notified | ✅ (`{processed:1, awaiting:1}`) |
| CLOSE-2 | Past-deadline auction WITHOUT bids → cron | Status → `unsuccessful`; clone prompt | ✅ (`unsuccessful:1`) |
| CLOSE-3 | Cron without `CRON_SECRET` | 401 | ✅ |
| CLOSE-4 | Cron with valid secret | 200 + processed count | ✅ (Vercel secret wired) |

### Review / leaderboard
| ID | Steps | Expected | Status |
|---|---|---|---|
| REV-1 | `/auctions/[id]/review` after close | Bids sorted by effective rate; average shown | ✅ |
| REV-2 | Seller identity post-close | Full corporate + contact revealed | ✅ |
| REV-3 | Currency formatting | On-screen amounts use ₹ (consistent) | ✅ (fixed this session) |

### Stage-2 counter (single round)
| ID | Steps | Expected | Status |
|---|---|---|---|
| S2-1 | Launch Stage-2 with counter rate | All participants notified; 24h window | ⏳ (UI present + rendering; logic 🧪) |
| S2-2 | Seller Accept / Reject / Final | Accept takes target; Reject keeps S1; Final = alt rate | 🧪 |
| S2-3 | Final rate > Stage-1 total | Server-rejected (price-drop lock) | 🧪 |
| S2-4 | No response | Lower-of leaves Stage-1 standing | 🧪 |

### Deal confirmation (DCR)
| ID | Steps | Expected | Status |
|---|---|---|---|
| DEAL-1 | Confirm deal (styled dialog) | Winner→won, others→lost, deal row, auction→closed | ✅ |
| DEAL-2 | DCR page `/deals/[id]` | Renders agreed terms; ₹ rate; GSTINs | ✅ |
| DEAL-3 | DCR wording (non-negotiable) | "mutual intent … not an automatically enforceable contract"; NO "legally binding" | ✅ |
| DEAL-4 | Both parties emailed | Identical confirmation to buyer + seller | ⏳ (needs Resend key) |

### Disputes
| ID | Steps | Expected | Status |
|---|---|---|---|
| DISP-1 | Raise dispute from DCR | Deal → disputed; appended to audit; never deleted | ⏳ (form present ✅) |
| DISP-2 | Operator dispute queue | Dispute appears; resolve | ⏳ (queue renders ✅, empty) |

### Export
| ID | Steps | Expected | Status |
|---|---|---|---|
| EXP-1 | Buyer exports CSV/PDF | File downloads (attachment) | ✅ (CSV download triggered) |
| EXP-2 | Participant seller export | Only own row | 🧪 (authz logic) |
| EXP-3 | Non-participant export | 403 | 🧪 |

### Notifications / Network / Members / Settings
| ID | Steps | Expected | Status |
|---|---|---|---|
| NOTE-1 | `/notifications` | Real events listed; mark-all-read; bell badge count | ✅ |
| NET-1 | `/network` register partner by GSTIN+CAS | Active if on platform else pending placeholder | ⏳ (page + form render ✅) |
| NET-2 | Remove partner (styled confirm) | Partner removed | ⏳ (dialog refactor) |
| MEM-1 | `/members` table + invite form | Members listed; invite sends link | ⏳ (renders ✅) |
| MEM-2 | Disable member | Forces reassign of owned items/auctions/bids; protects last admin | 🧪 |
| SET-1 | `/settings` | GST-locked identity (read-only); profile; Security "Soon" card | ✅ |
| SET-2 | Refresh from GST | Re-pulls legal name/address | ⏳ |
| DPDP-1 | `/settings/data` export me | JSON scoped to own profile | ⏳ (route 🧪) |

### Operator console
| ID | Steps | Expected | Status |
|---|---|---|---|
| OP-1 | `/operator` dashboard | Live analytics (companies, auctions, bids, deals, completion %, medians, burn) | ✅ |
| OP-2 | `/operator/companies` | Both companies; Suspend; manual GST override | ✅ (renders; Suspend present) |
| OP-3 | `/operator/disputes` | Dispute queue | ✅ (empty state) |
| OP-4 | `/operator/moderation` | Report queue | ✅ (empty state) |

### PWA / security
| ID | Steps | Expected | Status |
|---|---|---|---|
| PWA-1 | `/manifest.webmanifest`, icons | 200 | ✅ |
| SEC-1 | Two-company RLS proof | A cannot read B's bid/company/users; audit_log immutable | 🧪 (`scripts/rls-two-company-test.ts`) |
| SEC-2 | Blind-mode privacy | Competitor price/identity never reaches client | ✅ (rank server-only) |

---

## C. Multi-user simulation — `scripts/sim-multiuser.ts` (run 2026-06-12, 25/25 ✅)

Live-DB simulation using the REAL app engines (`runTargeting`, `computeTotalRate`, `rankOf`,
`stage2Total`, `isValidStage2Rate`) — 11 sellers + the demo buyer. Repeatable:
`npx tsx scripts/sim-multiuser.ts` then `--phase2`.

| ID | Scenario | Result |
|---|---|---|
| A1–A4 | 11 sellers: 5 carry Acetone, 5 other chemicals, 1 Acetone-but-blocked → exactly the 5 unblocked Acetone sellers targeted | ✅ |
| A5 | All 5 get in-app notifications (+ email send attempted per seller) | ✅ |
| A6–A7 | 5 bids in different material/transport/tax shapes → blind ranks #1–#5 by full total | ✅ |
| A8 | Deliberate ₹90.00 tie → earlier quote ranks ahead (tie-break) | ✅ |
| A9–A10 | Withdraw → drops from count, others' ranks shift up | ✅ |
| A11–A12 | Revise down → re-ranks to #1; revision keeps the original quote-time priority | ✅ |
| A13 | Buyer-visible bid count excludes withdrawn | ✅ |
| B1 | Past-deadline close via the REAL deployed cron → `awaiting_decision` | ✅ |
| B2 | Stage-2 price-drop lock: final material above own S1 material rejected | ✅ |
| B3–B4 | Stage-2 accept / final / reject / no-response → effective = min(S1 total, S2 material + carried freight+tax) | ✅ |
| B5 | Winner = lowest effective | ✅ |

**Browser verification on production (same auction):** seller S02 saw "#2 of 4 live bids" and
only their own price (blind privacy holds at scale); buyer leaderboard showed all 4 bids ranked
₹78 → ₹83 → ₹90 → ₹90 with tier breakdowns + Stage-2 outcomes; Confirm deal → Winner/Not-selected
badges; DB: winner `won`, deal `final_total=78`, withdrawn bid preserved.

**Bug found & fixed by this test:** placeholder bid rows are batch-created at targeting time, so
`created_at` couldn't break price ties (rank order between equal bids was undefined). Fix:
`created_at` is re-stamped at the seller's FIRST quote (revisions keep it); review leaderboard +
export gained the same timestamp tie-break.

## C2. Live QA run — 2026-06-10

Drove the deployed app end-to-end (buyer + seller + operator). **Full core loop verified working:**
post auction (CAS resolve → targeting) → seller gate (mask) → Accept (reveal) → full-qty bid → blind rank → cron close → review/leaderboard → confirm deal → Deal Confirmation Record → CSV export.

**No functionally-broken features found.** Findings (quality/polish, fixed or noted):

1. ~~Native `confirm()`/`alert()` dialogs (9 sites) — off-brand + thread-blocking.~~ **FIXED** — replaced with styled `ConfirmButton`/`ConfirmDialog` + inline errors.
2. ~~Review page showed "INR" while rest of app uses "₹".~~ **FIXED** — unified to ₹ on-screen.
3. Buy/Sell **mode preference is a browser cookie** that persists across users on the same browser (minor; user can toggle back). Noted, not fixed.
