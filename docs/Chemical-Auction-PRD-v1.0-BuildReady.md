# B2B Chemical Auction Platform — Build-Ready PRD

**Status:** v1.0 — Decision-complete (every open question resolved)
**Owner:** Two Clicks Media
**Last updated:** 4 June 2026
**Supersedes:** Draft v0.1 (analysis PRD)
**Deploy target:** Vercel

---

## How to read this document

The v0.1 PRD was an excellent *diagnosis* — it found 24 unresolved decisions and one hard contradiction. But a diagnosis can't be built. You cannot hand "⚠️ DECISION NEEDED" to Claude Code and expect one shot.

This version does three things v0.1 didn't:

1. **Resolves every decision** with a made call, the *why* behind it, and the alternative I rejected. (See §11 — the Decision Ledger.)
2. **Justifies every requirement from a user pain point.** For each feature I ask "why does this exist?" and trace it to a buyer or seller problem. If a feature couldn't be traced to a pain, I cut it.
3. **Locks the stack and data model** so the build prompts (separate file) have nothing left to guess.

**A note on the method you asked for** — "ask why on every point." I applied a 5-why discipline: a requirement only survives if it answers *why does the user need this?* down to a concrete pain. Features that only answered "the spec said so" were cut or deferred. Where adding something, I state the pain it removes. Where removing something, I state why its absence doesn't hurt the user.

---

## 1. The core insight (why this product exists at all)

**The pain, stated as the user feels it:**

> *Buyer:* "I need 10 MT of 99% Toluene by Friday. I'll call six suppliers, get six prices over WhatsApp, forget who said what, get a better price from #7 tomorrow, and have nothing to show my boss for why I picked who I picked."

> *Seller:* "I blast my availability to 200 contacts and get 50 tyre-kickers, 3 competitors fishing my price, and 1 real buyer — and I can't tell which is which until I've already shown my hand."

Everything in this product is downstream of those two sentences. The platform's only job is to make the buyer's six-call scramble into a **structured, auditable, blind reverse auction**, and to make the seller's blast into a **qualified, throttled, identity-protected** funnel.

**Why a reverse auction (not a forward listing marketplace like IndiaMART)?**
Because in chemicals the buyer's spec is precise (CAS + purity + quantity + packing) and the value is in *price discovery under competition*. A listings board makes the buyer do the work of comparing; a reverse auction makes sellers compete *to the buyer's exact spec*. That is the entire reason to build this instead of pointing people at IndiaMART.

**Why GST-anchored identity?**
The single biggest trust failure in informal chemical trade is "who am I actually dealing with?" Anchoring every account to a verified GSTIN means every counterparty is a real, tax-registered business. This is the product's trust moat and the reason a buyer will reveal their requirement to strangers.

**What this is NOT (v1):** not payments, not escrow, not logistics, not international. Money and goods move off-platform. *Why hold this line?* Because each of those is a regulated, capital-intensive product in its own right, and none of them is the pain above. Adding them now would 5x the build and delay the only thing users actually need: trustworthy price discovery.

---

## 2. Goals, non-goals, and what "good" looks like

### Goals (each tied to a pain)

| Goal | The pain it kills |
|---|---|
| A verified buyer launches a structured auction in < 5 min | The six-call scramble |
| Only *qualified* sellers (CAS + grade + role match) get notified | Seller spam + buyer noise |
| Buyer sees all bids in one comparable view across both stages | "I forgot who quoted what" |
| Tamper-proof audit trail of every bid/counter/accept/close | "Nothing to show my boss" |
| Seller's identity & price stay blind during bidding | "I don't want to show my hand / get price-fished" |

### Non-goals (v1) — and why each is safe to defer

- **On-platform payments / escrow / invoicing** — regulated, capital-heavy; not the core pain. Off-platform settlement works today.
- **Logistics / shipment tracking** — a separate product; buyers already have freight relationships.
- **International trade** — currency, customs, INCOTERMS complexity. Domestic India is the entire initial market.
- **Native mobile apps** — a responsive PWA covers the field-sales use case at a fraction of the cost. (§9)
- **Partial-quantity bids & multi-award** — see the headline decision in §5.4. Deferred to Phase 3, *if validated*.

### Success metrics (with starter targets — adjust after 60 days of real data)

| Metric | Definition | Why it matters | Starter target |
|---|---|---|---|
| **Activation** | % of registered companies publishing ≥1 auction within 14 days | Proves onboarding → value | ≥ 40% |
| **Liquidity** | Median qualified bids per auction | A marketplace dies below ~3 | ≥ 3 |
| **Completion** | % auctions reaching "Confirm Deal" vs. expiring | Proves the loop closes | ≥ 50% |
| **Time-to-close** | Median hours, launch → confirmation | Proves it beats phone/WhatsApp | < 48h |
| **Repeat rate** | Auctions per active buyer per month | Retention = product-market fit | ≥ 2 by month 3 |

*Why these five and not more?* Each maps to one stage of the funnel (onboard → publish → get bids → close → return). If any one collapses, you know exactly where the product is leaking.

---

## 3. Personas, roles & the role-model decision

| Role | Who | Core permissions |
|---|---|---|
| **Account Admin** | First person to register the GSTIN | Manage company profile, create/disable members, assign capabilities, reassign catalog on offboarding. **Can also buy and sell.** |
| **Member (Sales capability)** | Employee who lists/sells | Manage own catalog within the sales profile, respond to requests, send proactive shares |
| **Member (Purchase capability)** | Employee who buys | Create auctions, run the counter-offer round, confirm deals |
| **Platform Operator** | Two Clicks Media internal | Moderation, dispute queue, manual GST override, suspend accounts, analytics dashboard |

### ✅ DECISION — Role model

**One user, capability flags — not separate Sales/Purchase logins.**

A user has two independent boolean capabilities: `can_sell` and `can_buy`, set by the Admin. A person can have both. The UI shows a **Buy / Sell mode toggle** in the header for users with both. The Admin always has both, plus admin powers.

**Why.** Small and mid chemical firms routinely have one commercial person who both sources raw materials and sells finished product. Forcing them into two separate user accounts (the v0.1 ambiguity) means two logins, two inboxes, and duplicated identity — pure friction with zero user benefit. Capabilities-on-one-user is how every real B2B tool models this.

**The "department" concept is killed.** v0.1 flagged that "department" was used in the catalog-uniqueness rule but never defined or created anywhere. *Why remove it?* Because an undefined concept can't be built and the user never asked for departments — they asked for "don't let two of my people quote the same chemical and step on each other." We satisfy that pain with the concrete rule in §5.2 (one CAS per user per profile within a GSTIN) using a real **Team** label, not a phantom department.

---

## 4. Glossary (now defined, not deferred)

- **GSTIN** — 15-char Goods & Services Tax Identification Number. The unit of corporate identity. One GSTIN = one company account (§5.1).
- **Profile** — a company-level container, either **Sales** or **Purchase**. Catalog items live under a user *within* the Sales profile; auctions live under a user within the Purchase profile.
- **Team** — a free-text/dropdown label on a member (e.g., "Solvents", "Acids"), set by Admin. Replaces the undefined "department." Used only for the catalog-uniqueness collision message.
- **Quality grade** — three house tiers, now defined: **Pure** (analytical/reagent, highest purity, COA-critical), **Distilled** (distillation-grade, high but not analytical), **Trade** (commercial/technical grade). The real discriminator is the **minimum purity %** field; the grade is a coarse filter. Tooltip in UI states these definitions.
- **Proactive Material Share** — a *seller-initiated* offer (the mirror image of a buyer's auction): the seller picks a CAS from their catalog, sets indicative qty + grade + rate, and pushes it to buyers. Recipients see it through the same Accept/Ignore/Block gate. Full flow in §5.5.
- **Stage-1 / Stage-2** — Stage-1 = blind competitive bidding to deadline. Stage-2 = a single buyer-set counter-rate blasted to all participants, 24h timer.
- **Deal Confirmation Record** — the documented mutual agreement at close. *Not* called "legally binding" — see §5.7.

---

## 5. Functional requirements (each justified, decisions baked in)

### 5.1 Onboarding & identity

**FR-1.1 — GST-verified registration.**
On signup the company enters a GSTIN; the system calls a verification API to fetch legal name + registered address, which become the **locked** corporate identity.

> **Why locked?** The whole trust model collapses if a company can rename itself after bidding. Identity must be immutable and externally anchored.

✅ **DECISION — GST vendor:** Use **Surepass** GST Verification API as primary (clean docs, fast onboarding, ~₹2–4/call), with **GSTZen** (₹3,500/yr ≈ 5,000 calls) as the budget fallback. Wrap the call behind a `GstVerificationProvider` interface so the vendor can be swapped without touching app code.
*Why an interface, not a hard-coded vendor?* Because pricing and uptime in this category shift, and you'll want to A/B vendors. One adapter seam now saves a rewrite later.

✅ **DECISION — Multi-GSTIN:** **Each GSTIN is its own account in v1.** Store the PAN (derivable from the GSTIN: chars 3–12) on every account so accounts sharing a PAN *can* be grouped in a later phase, but do not build the rollup now.
*Why.* Each GSTIN is a legally distinct registration with its own address and compliance standing — treating them separately is actually *correct*, not a shortcut. A "corporate group" view is a Phase-2 convenience, not a v1 need.

✅ **DECISION — API downtime fallback:** Allow **provisional registration** flagged `verification_pending`. The user can complete their profile but **cannot publish or bid** until verification succeeds. A background job retries verification; Operator can manually override.
*Why.* Blocking signup entirely on a flaky third-party API loses users at the worst moment. Gating only the *trust-critical* actions (publish/bid) preserves the moat without a hard dead-end.

**FR-1.2** One account per unique GSTIN; duplicates blocked with "This GSTIN is already registered — contact your Admin or recover access."

**FR-1.3 — Corporate identity edits.** Legal name & address are **re-fetched from GST**, never hand-edited. A "Refresh from GST" button (rate-limited to once/quarter) re-pulls. *Why re-fetch instead of self-edit?* Self-editing a "locked" identity is a contradiction and an abuse vector. The source of truth is GSTN.

**FR-1.4 — First-admin establishment.** Email-link verification **and** phone OTP at signup. *Why both?* Email proves the corporate address; OTP proves a reachable human. Account recovery later depends on having both.

**FR-1.5 — Member creation.** Admin adds members (First/Last, corporate email, phone, designation, Team, capability flags). System emails an invite; **the member sets their own password on first login** (admin never sees it).
*Why member-set password?* Security hygiene + DPDP-friendliness — the admin should never hold a colleague's credential.

**FR-1.6 — Account & recovery flows (NEW — v0.1 omitted these entirely).**
Login, logout, "remember me", forgot-password (email reset link, 30-min expiry), member offboarding, admin handover.
- ✅ **DECISION — Offboarding reassignment:** When a member is disabled, the Admin **must reassign** their catalog items and any live auctions/bids to another capable member before the disable completes (a guided "reassign or cancel" modal). *Why mandatory?* The one-CAS-per-user rule (§5.2) means an orphaned catalog item is invisible and un-bid-able. Reassignment isn't optional; it's required for data integrity.
- ✅ **DECISION — Admin handover:** Operator-assisted, verified via the registered email + OTP on file. *Why operator-gated?* "The admin left" is a high-risk account-takeover surface; a human verification step is worth the friction.

**FR-1.7 — Security baseline (NEW).** Min 8-char password with complexity, bcrypt/argon2 hashing, 12-hour idle session timeout, rate-limited auth endpoints (5 attempts → lockout), all traffic TLS. 2FA via OTP is a Phase-2 toggle.
*Why a baseline now and 2FA later?* The baseline is table-stakes and cheap; full 2FA UX is a real chunk of work that shouldn't block v1.

### 5.2 Catalog & product listing

**FR-2.1 — Per-product role declaration.** For each chemical, the seller checks one or more of Manufacturer / Distributor / Trader. This drives buyer-side filtering.
*Why per-product, not per-company?* A firm may *manufacture* one acid and merely *trade* another. Buyers who want only manufacturers must be able to filter at the product level.

**FR-2.2 — CAS → name auto-fill via PubChem.** User enters a CAS; the app resolves the scientific name.

✅ **DECISION — PubChem reliability handling (grounded in research):** CAS is a *synonym* in PubChem, not a primary key, so a lookup can return zero, one, or many compounds.
- Query the PubChem PUG-REST `name/<cas>/synonyms` + `cids` endpoints; **dedup CIDs**.
- **0 results** → show "Couldn't find that CAS — enter the name manually" (manual-override path, item flagged `name_unverified`).
- **Exactly 1** → auto-fill, lock the name in bold.
- **2+** → show a disambiguation picker (name + CID) and let the user choose.
- **Cache** every resolved CAS↔name in a local `cas_cache` table; check cache before hitting PubChem.
*Why cache + fallback?* PubChem is free but rate-limited and occasionally down; caching cuts calls ~90% after warm-up and the fallback means a flaky API never blocks a listing. This directly answers v0.1's flagged risk.

**FR-2.3 — Custom mixtures.** Selecting "N/A" unlocks a free-text name field for blends ("80% Ethanol / 20% Water"). *Why keep this?* Real chemical trade includes house blends with no single CAS; excluding them would exclude real demand.

**FR-2.4 — Quality grade.** Pure / Distilled / Trade + a **minimum purity %** field. (Definitions in §4.) *Why both grade and %?* Grade is a fast filter; purity % is the real spec a buyer cares about.

**FR-2.5 — Cross-user uniqueness.** Within one GSTIN, a CAS may be held by only one user **per profile type** (Sales, Purchase). Collision shows: *"This product is already managed by [Name] ([Designation], [Team]) — [contact]."*
- **Bilateral exception:** the same CAS may exist once in Sales *and* once in Purchase (a firm both buys and sells it).
- ✅ **DECISION — collision is no longer a dead-end (NEW):** the collision dialog offers **"Request transfer"** (notifies the current owner + Admin) so a colleague can hand the item over. *Why?* v0.1 correctly flagged that the original alert just stopped — a wall with no door. A transfer path turns a blocker into a workflow.

**FR-2.6 — Catalog management (NEW).** Edit grade/role/mixture text; delist a product (**blocked with warning if it has a live auction/bid**). *Why block on live activity?* Pulling a product mid-auction would strand bidders and break the audit trail.

**FR-2.7 — Seller outreach throttling.** One Proactive Material Share per CAS per **rolling 7-day** window. Blocked attempts show the exact reset timestamp. Privacy toggle: Send to All / Registered Only.
✅ **DECISION — window:** **Rolling 7 days** (resolves the v0.1 "calendar week vs 7 days" conflict). *Why rolling?* Fairer and harder to game than a calendar reset that lets someone blast Sunday night and again Monday morning.

### 5.3 Auction (purchaser request) creation

**FR-3.1 — Request form fields:** validated CAS (locks name bold), **quantity + unit (kg / MT / L)** + minimum purity %, packing type, delivery address (default registered or custom), logistics basis (Delivered / Ex-Works), supplier-type filter (Mfr/Dist/Trader), one technical-spec attachment, plain-text remarks, closing date/time.

✅ **DECISION — units:** support **kg, MT, litres** via a unit selector; all bids inherit the auction's unit and rank by rate-per-that-unit. *Why?* v0.1 noted chemicals trade in MT/L, not just kg. Inheriting one unit per auction keeps every bid comparable without conversion math.

✅ **DECISION — closing timer:** min **6 hours**, max **14 days**, timezone **IST (explicit)**, buyer may **extend once** before close (adds ≤ 48h). *Why bounds?* Too short and sellers can't respond; too long and price discovery stalls. One extension handles "no bids yet" without enabling indefinite fishing.

✅ **DECISION — attachment rules:** single file, **PDF/JPG/PNG**, ≤ 10 MB, virus-scanned on upload, access-controlled (only qualified, accepted sellers can download). *Why scan + access-control?* Spec sheets are sensitive and an upload field is an attack surface.

**FR-3.2 — Registered network.** Buyers register partners by GSTIN + specific CAS.
✅ **DECISION — partner not yet on platform (NEW invite flow):** entering an unregistered GSTIN creates a **`pending` placeholder partner** and sends an invite email. "Registered Only" auctions **skip pending partners** and show a notice ("2 invited partners haven't joined yet"). *Why?* v0.1 flagged this dead-end; an invite flow turns "my supplier isn't here" into a growth loop.
✅ **DECISION — registration consent (NEW):** a company is **notified** when another firm registers it into a private network and can decline. *Why?* DPDP + basic respect — being silently added to someone's vendor list without knowing is a privacy problem.

**FR-3.3 — Privacy toggle + empty-network safeguard.** Send to All / Registered Only. "Registered Only" with zero *active* partners for that CAS blocks publication with a prompt to register/invite a vendor or switch to All.

**FR-3.4 — Targeting algorithm.** Two-tier match on CAS + quality grade; for N/A mixtures, tokenize on whitespace/punctuation and match **whole tokens only** (so "IPA" matches the token "IPA", never the substring inside "tdIPArt"). Then drop vendors whose declared role the buyer didn't select. Qualified vendors get in-app notification + email.
✅ **DECISION — tokenization:** whole-token, case-insensitive, against a normalized synonym list; no substring matching. *Why?* v0.1 flagged substring false-positives; whole-token matching is the standard fix and is trivial to implement.

### 5.4 Seller interaction & bidding — and THE headline decision

**FR-4.1 — Stage-1 gateway.** Opening a request, the seller sees basic requirements (pricing locked) and must pick **Accept & Quote** / **Ignore** / **Block This Purchaser** (this-CAS-only or all-requests). Same gate applies to buyers receiving a Proactive Share.
✅ **DECISION — "Ignore" is reversible (NEW):** an ignored auction moves to a collapsible "Ignored" list with an **"Un-ignore"** action while the auction is still open. *Why?* v0.1 flagged that a mis-click to "Ignore" was a permanent dead-end; reversibility costs nothing and prevents lost bids.

**FR-4.2 — Pre-qualification view.** After accepting, the header shows the buyer's corporate name + acting user + designation, and the seller can open the spec document.

**FR-4.3 — Split pricing engine.** Seller enters Basic Rate + Freight Rate (₹/unit); app auto-sums Total Rate.
✅ **DECISION — Ex-Works ↔ freight:** if the auction basis is **Ex-Works**, the freight field is **hidden and forced to ₹0**; Total = Basic. If **Delivered**, freight is **required**. *Why?* Ex-Works means the buyer arranges pickup, so seller-quoted freight is meaningless — hiding it removes the v0.1 contradiction and prevents nonsensical bids.

**FR-4.4 — Payment terms & lead time (NEW field — fixes a v0.1 gap).** The bid form **captures** payment terms (dropdown: Advance / Net 15 / Net 30 / Net 45 / LC) and lead time (days).
*Why add this?* v0.1 correctly noticed these appear in the closing summary but were **never entered anywhere** — a data field that materializes from nothing. They belong on the bid, where the seller actually commits to them.

✅ **DECISION — PARTIAL BIDS: DROPPED IN v1 (the headline call).**
**Every bid is for the full auction quantity. Single winner. No partial-quantity bids.**

This resolves v0.1's 🚨 flagged contradiction. The reasoning, fully:

- *The contradiction:* v0.1 let sellers bid on partial quantities **and** ranked everyone by per-unit rate **and** closed with one "Confirm Deal." Those three can't coexist. A 5,000 kg bid at ₹98 "out-ranks" a full 10,000 kg bid at ₹100 while only covering half the need — the ranking lies, and a single-winner close can't fulfil the order.
- *Why drop rather than build multi-award?* Research confirms multi-sourcing award-splitting is a genuine "winner determination" optimization problem (a small combinatorial solver, a basket-fill UI, per-line confirmations, and counter-offers that have to reason about quantity *and* price). That is a different, much larger product — and there's **no evidence yet that buyers want it.** Building it now means shipping months later to validate an unproven need.
- *What the user loses, and why it's OK:* a seller who can only supply part of the quantity simply doesn't bid (or arranges a partner offline, as they do today). The buyer gets clean, comparable, single-quantity price discovery — which *is* the core pain. We lose an edge case to nail the trunk.
- *The door stays open:* Phase 3 revisits partial + multi-award **only if** completion-rate data shows buyers abandoning auctions for lack of a full-quantity supplier.

**FR-4.5 — COA upload.** Seller uploads a Certificate of Analysis with the bid.
✅ **DECISION — make-to-order exception:** a **"COA on dispatch (make-to-order)"** checkbox lets the seller bid without a COA now, surfaced to the buyer as a labelled flag. *Why?* v0.1 flagged that MTO chemicals have no COA yet; forcing one would exclude legitimate manufacturers.

**FR-4.6 — Blind rank.** If the buyer enabled blind mode, the seller sees only their live rank (#3) by lowest Total Rate. Competitor identity/price masked. Revisable until close.
✅ **DECISION — ties:** **earlier-timestamp wins** the better rank. *Why?* Deterministic, intuitive, and rewards the seller who committed first.
✅ **DECISION — withdrawal (NEW):** a seller **may withdraw** a bid before close; status → `Withdrawn`, retained in the audit log (not deleted). *Why retain?* The audit trail is the product's reason to exist; withdrawn ≠ erased.

### 5.5 Seller-initiated Proactive Material Share (NEW — full flow)

v0.1 only described this feature's throttling and gate, never the actual screen. Defining it:

**FR-5.1 — Share creation.** Seller picks a CAS from their catalog → sets indicative quantity + unit, grade, min purity, indicative Basic/Freight rate, packing, optional spec doc, validity window, and privacy toggle (All / Registered Only). One share per CAS per rolling 7 days (FR-2.7).

**FR-5.2 — Recipient experience.** Targeted buyers (matched by their Purchase-profile catalog interest in that CAS) get an in-app + email notification. They see the share behind the same **Accept / Ignore / Block** gate. Accepting opens a lightweight negotiation: the buyer can accept the indicative rate or send one counter; the seller accepts/rejects. On agreement → a Deal Confirmation Record (same as §5.7).
*Why mirror the auction flow rather than invent a new one?* Consistency. Buyers and sellers learn one interaction grammar (gate → reveal → negotiate → confirm) and it applies in both directions.

### 5.6 Evaluation & counter-offer loop

**FR-6.1 — Stage-1 sort.** At deadline bids lock and sort lowest→highest Total Rate, with the auction average shown. Expanding a card reveals full corporate + contact details.

**FR-6.2 — Stage-2 counter (single round, all participants).**
✅ **DECISION:** Stage-2 is **one round**, **one counter-rate to all** participants, strict **24-hour** timer. No subsets, no multi-round in v1. *Why?* Multi-round, per-seller counters are a negotiation engine — powerful but complex and easy to abuse for price-fishing. One transparent round captures most of the value and is comprehensible to every user. Multi-round is a Phase-3 candidate.

**FR-6.3 — Final-2-hour urgency.** Ranks hidden, urgent push + email with the ₹ rate in the subject line. *Why hide ranks at the end?* To stop last-second rank-gaming and force sellers to quote their true floor.

**FR-6.4 — Vendor response routing.** Accept / Reject / Submit Final Alternative Rate. **Price-drop lock:** the Stage-2 rate cannot exceed the seller's Stage-1 bid (rejected with an input error). *Why the lock?* Stage-2 is a *negotiation down*; allowing a higher number would let sellers walk back their own competitive bid.

**FR-6.5 — Inactivity timeout.** No response in 24h → that seller's Stage-2 status = `Expired`; their **Stage-1 bid is preserved** and still selectable by the buyer.

✅ **DECISION — all sellers reject the counter (NEW):** the buyer **falls back to Stage-1 prices** — the auction is not dead. The super-comparison leaderboard (§5.7) already takes the *lower* of each seller's Stage-1/Stage-2, so a rejected counter simply leaves the Stage-1 number standing. *Why?* v0.1 flagged this as an unhandled cliff; falling back to Stage-1 means a failed negotiation never destroys the bids the buyer already earned.

### 5.7 Post-auction & closure

**FR-7.1 — Combined summary card** per vendor: Stage-1 block (qty, basic, freight, total, payment terms, lead time) + Stage-2 block (counter target + final action) + document downloads (spec + COA). No time pressure on the buyer here.

**FR-7.2 — Super-comparison leaderboard.** For each seller take the **lower** of their Stage-1 or Stage-2 total rate; sort sellers by that. *(Kept verbatim from v0.1 — it's the correct rule, and it's what makes the Stage-2-rejection fallback above work cleanly.)*

**FR-7.3 — Deep-dive profile + block.** Clicking a vendor opens the full corporate footprint; "Block Seller for this CAS" permanently mutes that seller for this buyer+CAS. Historical bid data retained with a 🔴 [Blocked] tag.

**FR-7.4 — Deal Confirmation Record (renamed from "Legal settlement").**
"Confirm Deal" locks the auction and emails both parties identical confirmations with corporate disclosures, contacts, and final commercials (qty, payment terms, lead time, split pricing).
✅ **DECISION — drop the "legally binding" claim.** It is a **Deal Confirmation Record** — documented mutual intent, governed by the **T&Cs accepted at signup** (Indian law, arbitration seat + jurisdiction stated in the T&Cs), not an auto-enforceable contract. A checkbox at signup captures T&C acceptance; the confirmation email states it records mutual intent and points to the T&Cs.
*Why.* An email is not automatically an enforceable contract, and claiming otherwise creates real liability for you and false confidence for users. Get the T&Cs lawyer-reviewed before launch. This is a where-it-matters honesty call, not a feature cut — the audit trail and record-keeping value is fully intact.

**FR-7.5 — Deal fall-through / dispute (NEW).** A confirmed deal can be marked **Disputed** by either party (reason + optional evidence), which opens an Operator dispute case. The record is **never deleted**; status changes are appended to the audit log.
*Why add a path v0.1 deliberately locked out?* v0.1 locked confirmed deals "permanently to prevent data mutation," which left **zero recourse** if a party backs out off-platform. Append-only status changes preserve the audit guarantee *and* give users a door. Immutability of *history* ≠ no new states.

**FR-7.6 — Export (NEW).** Buyer and seller can export a closed auction / deal as PDF or CSV for their accounting. *Why?* The audit trail is only useful if it can leave the platform into the user's records.

### 5.8 Records, notifications & market feed

**FR-8.1 — Sector folders.** Active / Closed / Expired-Unsuccessful, for both Purchase and Sales. Cards show corporate name (line 1) + user/designation (line 2).

**FR-8.2 — Auction lifecycle completeness (NEW — folds in v0.1's Appendix A).**
- **Edit after publish:** only non-spec-changing fields (remarks, extend deadline) once bids exist; quantity/CAS edits **disabled** after first bid (they'd invalidate existing bids). *Why?* Changing the spec mid-auction is unfair to those who already bid to the old spec.
- **Cancel/withdraw auction** before close → status `Cancelled`, all notified sellers informed.
- **Zero-bid outcome:** at close with no bids → auto-move to **Expired-Unsuccessful**, notify buyer, offer **Clone & relist** (one click, optionally to "Send to All"). *Why clone?* Re-running a failed auction is the #1 retention moment; make it one click.
- **Bids received but never confirmed:** auction stays in **Active → Awaiting Decision** for 14 days, then auto-archives to Closed (bids preserved). *Why a cap?* Prevents zombie auctions hanging open forever.

**FR-8.3 — Notification center (NEW).** A persistent in-app notification list with read/unread state and history — not just transient pop-ups. *Why?* A pop-up a user missed is a lost bid; B2B users need a durable inbox.
- **Email preferences / unsubscribe** for non-transactional emails (legally required in India + cuts spam complaints). Transactional auction emails (you have a bid, deadline near) are not unsubscribable but are clearly labelled.

**FR-8.4 — AI market feed (Phase 4, deliberately last).** Aggregated industry news personalized by profile: buyers see Price Trends + Govt Rules for their chemicals; sellers see Logistics + raw-material shifts. New users get a chronological mix until first listing.
✅ **DECISION — defer + de-risk:** Phase 4. Use a **scheduled batch** (daily Vercel Cron) that pulls a licensed news/RSS source, tags articles by chemical, and pre-computes per-profile feeds — **not** real-time per-user LLM analysis. *Why?* Real-time LLM summarization per user per page is an unbounded cost; precomputed batch tagging delivers 90% of the value at a fixed, tiny cost. And it's a retention nicety, not core — it ships last so it never blocks the marketplace loop.

---

## 6. Trust, safety & integrity (NEW section — folds in Appendix A.10)

- **Fake-auction / price-fishing defense.** *The threat:* a competitor posts sham auctions to harvest everyone's pricing. *Mitigations in v1:* (a) GST-verified identity raises the cost of a throwaway account; (b) rate-limit auctions per company per day; (c) buyers who repeatedly never confirm get a low "completion score" surfaced to sellers; (d) Operator can suspend. *Why care now?* Price-fishing destroys seller trust faster than any other failure — sellers stop bidding, liquidity dies.
- **Report a bad actor** (beyond block) → Operator queue.
- **Seller capability check** beyond GST is deferred (Phase 3) — block + completion-score cover v1.

---

## 7. Non-functional requirements

- **Security:** §5.1.7 baseline; encryption at rest (Supabase/Postgres) + in transit (TLS); access-controlled file downloads; rate limiting on auth + auction creation.
- **Privacy / DPDP Act 2023 + Rules 2025 (compliance deadline May 2027):** explicit consent checkbox at signup with itemized notice; published privacy policy; **data export + deletion request** flow; purpose-based retention policy (auctions retained for audit, PII deletable on request subject to legal-hold on disputes); breach log with 72-hour notification readiness; no processing of children's data (B2B only). Identities masked during bidding, revealed after accept — encode this in row-level access rules.
- **Audit log:** append-only table recording every bid, counter, accept, block, withdrawal, deal confirmation, and dispute status change. This is the product's spine — nothing mutates, everything appends.
- **Notifications infra:** **Resend** for email (great Vercel DX, generous free tier), in-app notification center for v1; web push + optional SMS (for 2-hour urgency) in Phase 2.
- **Availability:** target 99.5%; on downtime, in-flight auction timers are evaluated by the close-checking cron on recovery (timers are data-driven, not in-memory, so a deploy/outage never loses an auction).
- **File handling:** Supabase Storage, 10 MB cap, virus scan on upload, signed-URL access control.
- **Operator tooling:** moderation queue, dispute queue, manual GST override, account suspend, analytics dashboard (auctions, bids, completion rate, active companies, burn).

---

## 8. Tech stack (locked — Vercel-native)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router), TypeScript** | First-class on Vercel; server actions + route handlers cover the whole app |
| DB + Auth + Storage + Realtime | **Supabase (Postgres)** | One service gives Postgres, row-level-security auth, file storage, and realtime subscriptions — exactly the four things a blind live-bidding app needs. v0.1 correctly noted Sheets won't cut it. |
| ORM | **Drizzle** (or Prisma) | Typed schema, migrations, works with Supabase Postgres |
| Realtime rank updates | **Supabase Realtime** | Live "#3" rank without polling |
| Scheduled jobs (auction close, Stage-2 timer, news batch) | **Vercel Cron → API route** | Data-driven timers survive deploys/outages |
| Email | **Resend** | Clean Vercel integration, free tier covers MVP |
| GST verification | **Surepass** (GSTZen fallback) behind an adapter | Swappable vendor |
| CAS lookup | **PubChem PUG-REST** + local `cas_cache` | Free, cached, with manual fallback |
| UI | **Tailwind + shadcn/ui** | Fast, consistent, accessible components |
| Styling note | Responsive PWA (installable, push-ready) | Covers field sales without native apps |

**Why Supabase over a hand-rolled Postgres + NextAuth + S3 + Pusher stack?** Because every hour spent gluing four services together is an hour not spent on the auction logic that is the actual product. Supabase collapses auth + DB + storage + realtime into one, which is the single biggest lever for a *one-shot* build.

---

## 9. Data model (the spine the build prompts assume)

Core tables (Postgres / Supabase, all with `created_at`, soft-delete where noted):

- **companies** — `id, gstin (unique), pan, legal_name, registered_address, verification_status, completion_score`
- **users** — `id, company_id, first_name, last_name, email, phone, designation, team, can_buy, can_sell, is_admin, status`
- **catalog_items** — `id, company_id, owner_user_id, profile_type (sales|purchase), cas_number, name, name_verified, is_mixture, mixture_text, roles (mfr/dist/trader[]), grade, min_purity` — unique (company_id, cas_number, profile_type, owner constraint)
- **cas_cache** — `cas_number (pk), resolved_name, cid, status`
- **auctions** — `id, buyer_company_id, buyer_user_id, cas_number, name, quantity, unit, min_purity, packing, delivery_address, logistics_basis, supplier_filter[], spec_file_url, remarks, privacy_mode, blind, status, closes_at, stage, created_at`
- **registered_partners** — `id, buyer_company_id, partner_gstin, cas_number, status (active|pending)`
- **bids** — `id, auction_id, seller_company_id, seller_user_id, stage1_basic, stage1_freight, stage1_total, payment_terms, lead_time_days, coa_file_url, coa_on_dispatch, stage2_rate, stage2_action, status (active|withdrawn|expired|won|lost), created_at, updated_at`
- **proactive_shares** — mirror of auctions, seller-initiated
- **blocks** — `id, blocker_company_id, blocked_company_id, cas_number (nullable = all), scope`
- **deals** — `id, auction_id, buyer_company_id, seller_company_id, final_total, payment_terms, lead_time_days, status (confirmed|disputed), confirmed_at`
- **notifications** — `id, user_id, type, payload, read_at`
- **audit_log** — `id, actor_user_id, entity_type, entity_id, action, snapshot_json, created_at` (append-only)
- **disputes** — `id, deal_id, raised_by_user_id, reason, evidence_url, status`

---

## 10. Phased delivery (what ships when, and why in this order)

**Phase 1 — Core loop (full-quantity only).** GST onboarding (+provisional fallback), catalog with cached CAS lookup, auction creation, targeting, Stage-1 blind bidding, single-winner closure, Deal Confirmation Record, sector folders, notification center, basic Operator dashboard. *Why first?* This is the entire core pain solved end-to-end. Everything else is amplification.

**Phase 2 — Negotiation.** Stage-2 single-round counter, super-comparison leaderboard, urgency workflow, web push + SMS, 2FA, export. *Why second?* Negotiation deepens value but the loop already closes without it.

**Phase 3 — Depth (only if validated).** Partial bids + multi-award (gated on data showing buyers abandon for lack of full-quantity supply), registered-network privacy refinements, proactive shares, reputation, multi-round counters, corporate-group (multi-GSTIN rollup). *Why gated?* These are the expensive, unproven bets — build them when usage proves the need.

**Phase 4 — AI market feed.** Batch-tagged news. *Why last?* Retention nicety, not core; highest cost-to-value ratio.

---

## 11. Decision Ledger (the 24 open questions, now closed)

| # | v0.1 open question | ✅ Decision | Why (the rejected alternative) |
|---|---|---|---|
| 1 | Partial bids vs single-winner | **Drop partials; single winner, full-qty** | Multi-award is a different, unproven product; per-unit ranking across qtys is incoherent |
| 2 | Cost / burn | **Free to users; track burn/company; cheap tiers; defer AI** | No revenue yet; minimize fixed cost until liquidity proven |
| 3 | GST vendor + multi-GSTIN | **Surepass (GSTZen fallback) via adapter; each GSTIN = own account; store PAN** | Each GSTIN is legally distinct; rollup is a later convenience |
| 4 | Role model | **One user, can_buy/can_sell flags + mode toggle; Admin can do both** | Separate logins = pure friction for firms that buy & sell |
| 5 | "Legally binding" | **Deal Confirmation Record + signup T&Cs; lawyer-review** | Email ≠ enforceable contract; overclaiming = liability |
| 6 | "Department" | **Killed; replaced by Team label** | Undefined concept; user pain met by one-CAS-per-user rule |
| 7 | Quality grades | **Pure/Distilled/Trade defined + min purity % field** | Purity % is the real discriminator |
| 8 | PubChem handling | **Cache + 0/1/many fallback + manual override** | Free but flaky/rate-limited; caching cuts calls ~90% |
| 9 | Ex-Works ↔ freight | **Ex-Works hides+zeroes freight; Delivered requires it** | Seller freight is meaningless when buyer arranges pickup |
| 10 | Payment terms / lead time | **Captured on the bid form** | Can't display what was never entered |
| 11 | Counter-offer scope | **Single round, all participants** | Multi-round = abuse-prone negotiation engine; defer |
| 12 | Auction duration | **6h–14d, IST, one ≤48h extension** | Bounds protect both sides; extension handles slow starts |
| 13 | Ties / withdrawal | **Earlier timestamp wins; withdrawal allowed, audit-retained** | Deterministic; rewards first commit; history never erased |
| 14 | Partner not on platform | **Invite flow + pending placeholder; skipped in Registered-Only** | Turns a dead-end into a growth loop |
| 15 | Units | **kg / MT / L per auction, bids inherit unit** | Chemicals trade in MT/L |
| 16 | Auth / recovery / offboarding | **Full flows; mandatory catalog reassignment on offboarding** | Orphaned catalog items break the one-CAS rule |
| 17 | DPDP compliance | **Consent, privacy policy, export/delete, breach log, retention** | Law (Rules 2025, deadline 2027); table-stakes trust |
| 18 | Notifications infra | **Resend email + in-app center v1; push/SMS Phase 2** | Durable inbox beats transient pop-ups |
| 19 | Operator tooling | **Moderation, dispute queue, GST override, suspend, analytics** | Needed from day one of real users |
| 20 | Market feed | **Phase 4, batch-tagged, not real-time LLM** | Unbounded per-user LLM cost; it's a nicety |
| 21 | Tech stack | **Next.js + Supabase + Resend on Vercel** | Collapses auth/DB/storage/realtime — best one-shot lever |
| 22 | Reputation | **Completion-score only in v1; full reputation Phase 3** | Block + score cover the trust gap cheaply |
| 23 | In-app messaging | **Deferred** | Negotiation is structured, not chat; out of scope |
| 24 | Zero-bid auction | **Auto-Unsuccessful + Clone & relist** | Re-run is the key retention moment |

---

## 12. Open items that genuinely need a human (not punted — just not yours to code)

These are the only things I did *not* decide, because they require your business/legal judgement, not a product call:

1. **T&C legal review** — get the Deal Confirmation Record T&Cs (governing law, arbitration seat, dispute process) drafted/reviewed by an Indian commercial lawyer before launch.
2. **GST vendor contract** — confirm Surepass/GSTZen pricing + rate limits against your expected signup volume; sign the one that fits your burn.
3. **News licensing** (Phase 4 only) — pick a licensed news/RSS source; don't scrape (ToS/legal risk).
4. **Success-metric targets** — the starter targets in §2 are industry-reasonable guesses; replace with your own after 60 days of data.

Everything else is decided and encoded in the build prompts.
