# DESIGN.md — Design system & guidelines

> Source of truth for how Chemical Auction looks, feels, and talks. We operate like
> a product design team: align on the system here, then every screen inherits it.
> If a screen contradicts this doc, the doc wins — fix the screen.

---

## 1. Who we design for (and the one rule that follows)

Our users are **chemical-trade professionals** — procurement leads, sales managers,
distributors. They know CAS numbers, purity %, grades, GSTIN, payment terms, freight,
and Ex-Works **better than we do**. Many are **not software-native**: they live in
WhatsApp, Excel, and phone calls, not SaaS dashboards.

**The rule that follows from this:**

> **Explain the platform. Assume the chemistry.**

- ❌ Never explain domain terms (CAS, purity, Ex-Works, GSTIN, COA). Insulting + cluttered.
- ✅ Always make the *platform mechanics* obvious: blind bidding & rank, Stage-1 vs
  Stage-2, the Accept / Ignore / Block gate, why identities are masked, what a
  "Deal Confirmation Record" is, the Buy/Sell mode toggle.

### Persona friction map → where help earns its place

| Moment | Persona reaction | Our response |
|---|---|---|
| First sees Buy/Sell **mode toggle** | "Which am I?" | One-line hint on first dashboard; label the toggle clearly |
| Seller hits the **locked gate** (Accept/Ignore/Block) | "Why can't I see the price?" | Inline hint: pricing unlocks after you Accept; identity stays masked until then |
| Seller sees **blind rank `#3`** | "Rank of what? Can they see mine?" | Tooltip: rank by lowest total; nobody sees competitor prices or who you are |
| Buyer launches **Stage-2** | "Did I just end it?" | Callout: one counter, 24h, sellers can accept/reject/counter-down only |
| Anyone reads **"Deal Confirmation Record"** | "Is this a contract?" | Persistent line: records mutual intent under T&Cs, not auto-enforceable |
| Empty **catalog / auctions / requests** | "Now what?" | Empty states that teach the next action, not just "No data" |

**Where NOT to add help:** obvious fields (name, email), domain inputs (CAS, purity),
anything repeated on the same screen, or any control whose label already says it.
Help text is a scalpel, not wallpaper. If in doubt, leave it out and let layout carry it.

---

## 2. Brand personality

**Calm · Premium · Plainspoken · Trustworthy.**

Trust is the product's reason to exist (buyers reveal sensitive requirements to
strangers). So the UI must feel **composed and high-quality** — never busy, loud, or
"techy." Think the quiet confidence of Mercury / Linear / Stripe, warmed up a few
degrees so it's approachable rather than austere.

Three adjectives we are **not**: cluttered, neon, playful-gimmicky.

---

## 3. Foundations

### 3.1 Color — warm-tinted neutrals + one confident accent

We avoid cold pure-gray-on-white (the default "AI dashboard" tell). Neutrals carry a
faint warm tint; a single **teal** accent signals brand + interactive emphasis;
semantic colors are muted, not fluorescent. Values are authored in `globals.css`.

| Token | Light | Use |
|---|---|---|
| `--background` | warm near-white (`stone 50`) | page |
| `--card` | pure white, lifted by shadow not border | surfaces |
| `--foreground` | warm ink (not pure black) | text |
| `--muted-foreground` | warm gray | secondary text |
| `--primary` | deep warm ink | primary actions (premium, calm) |
| `--accent-brand` | **teal 600** | brand marks, active nav, focus, links |
| `--success / --warning / --destructive` | muted green / amber / red | status only |
| `--border` | low-contrast warm gray | hairlines (use sparingly) |

Rules:
- **One accent.** Teal is the only brand color. No gradients, no second hue competing.
- **Prefer elevation over borders.** Cards lift with soft shadow; reserve borders for
  dense tables and inputs. Never nest a bordered card inside a bordered card.
- **Status colors are for status**, never decoration.
- Contrast: body text ≥ 4.5:1, large text/UI ≥ 3:1. Never gray text on a colored fill.

### 3.2 Typography — Plus Jakarta Sans

One family, loaded via `next/font` (self-hosted, no layout shift). Friendly + premium,
highly legible — deliberately **not** Inter (the universal AI tell).

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Display (hero) | 40–56px / 1.05 | 700 | -0.02em |
| H1 page title | 24–30px / 1.2 | 700 | -0.015em |
| H2 section | 18–20px / 1.3 | 600 | -0.01em |
| Body | 14–16px / 1.55 | 400–500 | 0 |
| Label / caption | 12–13px / 1.4 | 500 | 0 |
| Numeric (rates, qty) | tabular-nums | 500–600 | 0 |

Rules: tighten tracking as size grows; never center long-form text; max measure ~70ch;
money/quantities use `tabular-nums` so columns align.

### 3.3 Space, radius, elevation

- **Spacing scale** (4px base): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Pick from the scale;
  don't free-hand. Generous vertical rhythm = the "premium" feeling.
- **Radius:** `--radius: 0.75rem` (cards/buttons), inputs `0.625rem`, pills full. Slightly
  rounder than default = calmer, friendlier.
- **Elevation (3 steps only):**
  - `shadow-xs` — inputs, hairline lift
  - `shadow-sm` — cards at rest
  - `shadow-md` — hover / popovers / menus
  Soft, low-spread, warm-tinted. No hard 1px-black shadows.

### 3.4 Motion — subtle, purposeful, ≤ 200ms

- Transitions: 120–180ms, `ease-out` for enter, `ease-in` for exit.
- Animate **color, opacity, transform** only (cheap). Never animate layout/size on hover.
- Hover: ≤ 2px lift or a tint shift, never a bounce. Respect `prefers-reduced-motion`.
- Loading: a quiet spinner or skeleton, never a flashy progress dance.

---

## 4. Components & patterns

- **Buttons:** primary = solid ink; secondary = subtle tinted/outline; ghost = text.
  One primary action per view. Destructive only for destructive acts. Always show a
  pending state on async actions.
- **Inputs:** label above, generous height (44px touch), clear focus ring in teal,
  helper/error text below. Required marked subtly. Group related fields.
- **Cards:** white, `shadow-sm`, rounded, padding 20–24px. Title + supporting line; don't
  cram. One job per card.
- **Tables:** for dense comparison (bids, members, companies). Tabular numerals, zebra-free,
  hover row tint, sticky header on long lists.
- **Badges:** status only — success/warning/secondary/destructive. Lowercase or Title, one word.
- **Empty states:** icon + one-sentence "what this is" + the primary next action. Teach, don't apologize.
- **Help affordances (the persona layer):**
  - `Hint` — one quiet line under a control or section. For first-encounter mechanics.
  - `InfoTip` — a small ⓘ next to a label; tooltip explains the platform concept.
  - `Callout` — a boxed note for an important, easy-to-misread action (Stage-2, blind mode).
  - Use at most **one** help affordance per concept per screen.

---

## 5. UX writing voice

- **Plain, warm, specific.** "Sellers see only their own rank — never a competitor's price."
  Not "Bid visibility is restricted per the privacy model."
- Verbs on buttons: "Accept & quote", "Publish auction", "Confirm deal" — say the outcome.
- Errors: say what happened + how to fix. "That CAS isn't valid — check the format (e.g. 108-88-3)."
- No jargon, no "Oops!", no exclamation spam. Never the word "legally binding".
- Numbers: ₹ with `tabular-nums`; units as kg / MT / L; dates in IST.

---

## 6. Anti-patterns (auto-fail in review)

- Inter as the typeface · purple→blue gradients · card-nested-in-card · gray text on a
  colored fill · an icon-tile above every heading · hard black 1px shadows · two competing
  accent colors · centered paragraphs · emoji as UI chrome · explaining CAS/purity/Ex-Works
  to domain experts · help text on obvious fields · a screen with no clear primary action.

---

## 7. How we work (the loop)

1. Change the **system** (tokens/type/primitives) — it propagates to all 29 routes.
2. Hand-polish **hero flows** (landing, auth, dashboard, auction create, bidding, review, operator).
3. Add the **persona help layer** exactly where the friction map says, nowhere else.
4. **Review** (`/design-review` + `/impeccable audit` once installed) for slop & inconsistency.
5. Keep this doc current — it is the contract.
