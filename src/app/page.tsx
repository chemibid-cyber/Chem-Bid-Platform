import Link from 'next/link';
import {
  ArrowRight,
  Check,
  X,
  ShieldCheck,
  EyeOff,
  FileText,
  Lock,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Reveal } from '@/components/brand/reveal';
import { LiveBoard } from '@/components/brand/live-board';

const STEPS = [
  {
    n: '01',
    title: 'Post a requirement',
    body: 'CAS number, purity, quantity, packing, delivery and a deadline. Auto-filled from the chemical catalog. Under five minutes.',
  },
  {
    n: '02',
    title: 'Qualified sellers bid blind',
    body: 'Only sellers who actually carry your CAS are invited. Each one sees only their own live rank — never a rival’s price, never a rival’s name.',
  },
  {
    n: '03',
    title: 'Negotiate one clean round',
    body: 'Open a single counter to your shortlist. Sellers respond once. No endless back-and-forth, no phone tag.',
  },
  {
    n: '04',
    title: 'Confirm & record',
    body: 'Pick one winner. Every bid, counter, accept and close is written to an append-only audit trail you can export anytime.',
  },
];

const BUYER_BENEFITS = [
  { t: 'Genuine price discovery', b: 'Sellers compete in the dark, so the winning bid is the true market floor.' },
  { t: 'Only verified sellers', b: 'Every counterparty is a GST-registered business — legal name straight from the GST network.' },
  { t: 'CAS-precise targeting', b: 'Reach only sellers who carry your exact chemical, grade and purity. No spam, no tyre-kickers.' },
  { t: 'A record that holds up', b: 'Append-only history of every action. Settle disputes with facts, not screenshots.' },
];

const SELLER_BENEFITS = [
  { t: 'Your price never leaks', b: 'Competitors can’t see your bid — only the buyer does, and only after you accept.' },
  { t: 'Relevant requests only', b: 'Get notified for the exact chemicals you actually supply. Skip the rest.' },
  { t: 'Live rank, fair rules', b: 'See where you stand in real time. Lowest total wins, ties go to whoever bid first.' },
  { t: 'Reach verified buyers', b: 'Every requirement comes from a real GST-registered company with a genuine need.' },
];

const COMPARE = [
  { label: 'Price discovery', old: 'Anchored, leaky', oldIcon: false, neo: 'Blind & true', neoIcon: false },
  { label: 'Your price stays private', old: '', oldIcon: 'x', neo: '', neoIcon: 'check' },
  { label: 'Verified counterparties', old: '', oldIcon: 'x', neo: '', neoIcon: 'check' },
  { label: 'Permanent record', old: 'Screenshots', oldIcon: false, neo: 'Append-only log', neoIcon: false },
  { label: 'Time to a decision', old: 'Days of chasing', oldIcon: false, neo: 'One deadline', neoIcon: false },
] as const;

const TRUST = [
  {
    icon: ShieldCheck,
    t: 'GST-verified identity',
    b: 'One GSTIN per company. Legal name and address pulled from the GST network — never hand-edited.',
  },
  {
    icon: EyeOff,
    t: 'Blind by design',
    b: 'A seller’s price and identity are masked from rivals at the database level, not just the screen.',
  },
  {
    icon: FileText,
    t: 'Append-only audit',
    b: 'Nothing is ever deleted. Withdrawals and disputes are status changes added to history.',
  },
  {
    icon: Lock,
    t: 'Row-level security',
    b: 'Every table enforces who can read what. Your data is fenced from other companies by the database itself.',
  },
];

const FAQ = [
  {
    q: 'Is it really free?',
    a: 'Yes. No subscription and no commission on deals. We make the marketplace useful first.',
  },
  {
    q: 'What is a blind reverse auction?',
    a: 'Buyers post one requirement; invited sellers bid the full quantity. Each seller sees only their own rank, never a competitor’s price. Lowest total wins.',
  },
  {
    q: 'How do you verify businesses?',
    a: 'Every company signs up with a GSTIN. We pull the legal name and address from the GST network — you can’t edit them by hand.',
  },
  {
    q: 'Can one account both buy and sell?',
    a: 'Yes. A single login carries buy and sell capabilities with a mode toggle — no separate accounts.',
  },
  {
    q: 'Can competitors see my price?',
    a: 'No. Your bid is masked from other sellers at the database level. The buyer sees it only after you accept and quote.',
  },
  {
    q: 'Is a confirmed deal legally binding?',
    a: 'No. A Deal Confirmation Record captures mutual intent under the terms you both agree to at signup. It is a record, not a legal contract.',
  },
];

const INK = '#15100C';
const PAPER = '#F8F5F1';
const PAPER2 = '#FFFFFF';
const MOLTEN = '#FF5A1F';

export default function LandingPage() {
  return (
    <div className="cb-land" style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(21,16,12,0.86)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(244,238,231,0.12)',
        }}
      >
        <div
          className="cb-wrap"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                display: 'inline-flex',
                width: 28,
                height: 28,
                borderRadius: 8,
                background: MOLTEN,
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1A0E06',
              }}
            >
              <LogoMark className="h-[15px] w-[15px]" />
            </span>
            <span className="cb-disp" style={{ color: '#F4EEE7', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              ChemiBid
            </span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span className="cb-nav-links">
              <a className="cb-navlink" href="#how">How it works</a>
              <a className="cb-navlink" href="#buyers">For buyers</a>
              <a className="cb-navlink" href="#sellers">For sellers</a>
              <a className="cb-navlink" href="#pricing">Pricing</a>
              <span style={{ width: 1, height: 16, background: 'rgba(244,238,231,0.12)' }} />
            </span>
            <Link className="cb-navlink" href="/login" style={{ color: '#F4EEE7' }}>
              Log in
            </Link>
            <Link className="cb-btn cb-btn--molten" href="/signup" style={{ padding: '8px 14px', fontSize: 13 }}>
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', background: INK, overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 520,
            height: 520,
            background: 'radial-gradient(circle,rgba(255,90,31,0.20),rgba(255,90,31,0) 62%)',
            pointerEvents: 'none',
          }}
        />
        <div className="cb-wrap cb-hero-grid" style={{ position: 'relative', padding: '64px 24px 72px' }}>
          <Reveal>
            <span
              className="cb-chip cb-kick"
              style={{ background: 'rgba(255,90,31,0.12)', color: '#FFB020', border: '1px solid rgba(255,90,31,0.25)' }}
            >
              B2B chemical procurement · India
            </span>
            <h1
              className="cb-disp"
              style={{
                color: '#F4EEE7',
                fontWeight: 700,
                fontSize: 'clamp(2.5rem, 5.4vw, 4.25rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                marginTop: 18,
                maxWidth: 640,
              }}
            >
              WhatsApp is not a procurement strategy.
            </h1>
            <p style={{ color: 'rgba(244,238,231,0.55)', fontSize: 16, lineHeight: 1.62, marginTop: 18, maxWidth: 520 }}>
              Stop running the six-call price scramble. Post one requirement, let GST-verified sellers bid{' '}
              <span style={{ color: '#F4EEE7' }}>blind</span>, and settle on the real lowest price — with a record you
              can actually stand behind.
            </p>
            <div style={{ display: 'flex', gap: 11, marginTop: 26, flexWrap: 'wrap' }}>
              <Link className="cb-btn cb-btn--molten" href="/signup" style={{ padding: '13px 19px' }}>
                Get started free — verify your GSTIN <ArrowRight className="h-4 w-4" />
              </Link>
              <a className="cb-btn cb-btn--ghost" href="#how" style={{ padding: '13px 19px' }}>
                See how it works
              </a>
            </div>
            <div
              className="cb-mono"
              style={{ color: 'rgba(244,238,231,0.55)', fontSize: 11, marginTop: 18, letterSpacing: '0.02em' }}
            >
              Free to use · No credit card · GST-verified businesses only
            </div>
          </Reveal>

          <Reveal delay={120} style={{ justifySelf: 'center', width: '100%', maxWidth: 440 }}>
            <LiveBoard />
          </Reveal>
        </div>
      </section>

      {/* ── Logo strip ── */}
      <section style={{ background: PAPER, padding: '26px 24px', borderBottom: '1px solid rgba(22,16,10,0.10)' }}>
        <div className="cb-wrap">
          <div className="cb-mono" style={{ textAlign: 'center', color: '#6E6155', fontSize: 11, marginBottom: 16 }}>
            Trusted by chemical businesses across India
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="cb-disp"
                style={{
                  color: '#B6AB9E',
                  fontWeight: 700,
                  fontSize: 15,
                  border: '1px dashed rgba(22,16,10,0.14)',
                  padding: '8px 16px',
                  borderRadius: 7,
                }}
              >
                Your logo
              </span>
            ))}
          </div>
          <div className="cb-mono" style={{ textAlign: 'center', color: '#B6AB9E', fontSize: 10, marginTop: 12 }}>
            Real customer logos go here — you supply the names and files.
          </div>
        </div>
      </section>

      {/* ── The problem ── */}
      <section className="cb-sec" style={{ background: PAPER }}>
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#E04A12' }}>The problem</span>
            <h2 className="cb-h2" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.1rem)', marginTop: 12, maxWidth: 560 }}>
              The old way leaks your price and burns your week.
            </h2>
            <p className="cb-lead" style={{ marginTop: 12, maxWidth: 560 }}>
              Six phone calls. A dozen WhatsApp threads. Every seller hears what the last one quoted, so nobody sharpens
              their pencil. You never really know if you got the best price — and there’s no record of who said what.
            </p>
          </Reveal>
          <div className="cb-grid-2" style={{ marginTop: 24 }}>
            <Reveal>
              <div style={{ background: INK, borderRadius: 12, padding: 16, height: '100%' }}>
                <div className="cb-kick" style={{ color: '#C9756B', marginBottom: 11 }}>The scramble</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Bubble side="in">Bhai, best rate on toluene?</Bubble>
                  <Bubble side="out">₹1,18,000, PI bhej do</Bubble>
                  <Bubble side="in">Someone else said 1,15…</Bubble>
                  <Bubble side="out">ok match kar dunga</Bubble>
                  <div className="cb-mono" style={{ color: '#8A7C6E', fontSize: 10, marginTop: 3 }}>
                    …still waiting on 4 others
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="cb-card" style={{ padding: 16, height: '100%' }}>
                <div className="cb-kick" style={{ color: '#E04A12', marginBottom: 11 }}>The ChemiBid way</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'One spec, posted once',
                    'Sellers bid without seeing each other',
                    'True lowest price surfaces',
                    'Every step on an audit trail',
                  ].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          background: 'rgba(255,90,31,0.12)',
                          color: '#E04A12',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how"
        className="cb-sec"
        style={{ background: PAPER2, borderTop: '1px solid rgba(22,16,10,0.10)', borderBottom: '1px solid rgba(22,16,10,0.10)' }}
      >
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#E04A12' }}>How it works</span>
            <h2 className="cb-h2" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.1rem)', marginTop: 12 }}>
              From requirement to record in four steps.
            </h2>
            <p className="cb-lead" style={{ marginTop: 12, maxWidth: 560 }}>
              No training, no sales call. If you can describe what you need to buy, you can run a structured blind
              auction today.
            </p>
          </Reveal>
          <div style={{ marginTop: 22 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 70}>
                <div
                  style={{
                    display: 'flex',
                    gap: 18,
                    padding: '18px 0',
                    borderBottom: i < STEPS.length - 1 ? '1px solid rgba(22,16,10,0.10)' : 'none',
                  }}
                >
                  <span
                    className="cb-disp cb-mono"
                    style={{ color: MOLTEN, fontWeight: 700, fontSize: 22, minWidth: 38, flexShrink: 0 }}
                  >
                    {s.n}
                  </span>
                  <div>
                    <div className="cb-disp" style={{ fontWeight: 500, fontSize: 16 }}>{s.title}</div>
                    <p className="cb-lead" style={{ marginTop: 5, fontSize: 14 }}>{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── For buyers ── */}
      <section id="buyers" className="cb-sec" style={{ background: INK }}>
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#FFB020' }}>For buyers</span>
            <h2 className="cb-h2" style={{ color: '#F4EEE7', fontSize: 'clamp(1.6rem,3.4vw,2.1rem)', marginTop: 12, maxWidth: 520 }}>
              The real lowest price, every single time.
            </h2>
            <p style={{ color: 'rgba(244,238,231,0.55)', fontSize: 15, lineHeight: 1.62, marginTop: 12, maxWidth: 540 }}>
              Blind competition does the negotiating for you. When sellers can’t see each other, they quote their real
              number — not a number anchored to the last guy.
            </p>
          </Reveal>
          <div className="cb-grid-2" style={{ marginTop: 22 }}>
            {BUYER_BENEFITS.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <div style={{ background: '#1F1812', border: '1px solid rgba(244,238,231,0.12)', borderRadius: 10, padding: 16, height: '100%' }}>
                  <div className="cb-disp" style={{ color: '#F4EEE7', fontWeight: 500, fontSize: 14 }}>{f.t}</div>
                  <p style={{ color: 'rgba(244,238,231,0.55)', fontSize: 13, lineHeight: 1.55, marginTop: 5 }}>{f.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── For sellers ── */}
      <section id="sellers" className="cb-sec" style={{ background: PAPER }}>
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#E04A12' }}>For sellers</span>
            <h2 className="cb-h2" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.1rem)', marginTop: 12, maxWidth: 520 }}>
              Win on price, not on who you know.
            </h2>
            <p className="cb-lead" style={{ marginTop: 12, maxWidth: 540 }}>
              No more being undercut by a rumor. You’re invited only to requirements you genuinely qualify for, and your
              number stays yours.
            </p>
          </Reveal>
          <div className="cb-grid-2" style={{ marginTop: 22 }}>
            {SELLER_BENEFITS.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <div className="cb-card" style={{ padding: 16, height: '100%' }}>
                  <div className="cb-disp" style={{ fontWeight: 500, fontSize: 14 }}>{f.t}</div>
                  <p className="cb-lead" style={{ fontSize: 13, marginTop: 5 }}>{f.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="cb-sec" style={{ background: INK }}>
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#FFB020' }}>ChemiBid vs the old way</span>
            <h2 className="cb-h2" style={{ color: '#F4EEE7', fontSize: 'clamp(1.5rem,3.2vw,2rem)', marginTop: 12 }}>
              Same chemical. A completely different process.
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <div style={{ marginTop: 22, border: '1px solid rgba(244,238,231,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', background: '#1F1812' }}>
                <div style={{ padding: '11px 14px' }} />
                <div className="cb-mono" style={{ padding: '11px 14px', color: 'rgba(244,238,231,0.55)', fontSize: 11, textAlign: 'center', borderLeft: '1px solid rgba(244,238,231,0.12)' }}>
                  Phone &amp; WhatsApp
                </div>
                <div className="cb-disp" style={{ padding: '11px 14px', color: MOLTEN, fontSize: 12, fontWeight: 500, textAlign: 'center', borderLeft: '1px solid rgba(244,238,231,0.12)' }}>
                  ChemiBid
                </div>
              </div>
              {COMPARE.map((r) => (
                <div
                  key={r.label}
                  style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', borderTop: '1px solid rgba(244,238,231,0.12)', fontSize: 13 }}
                >
                  <div style={{ padding: '13px 14px', color: '#F4EEE7' }}>{r.label}</div>
                  <div style={{ padding: '13px 14px', color: 'rgba(244,238,231,0.55)', textAlign: 'center', borderLeft: '1px solid rgba(244,238,231,0.12)' }}>
                    {r.oldIcon === 'x' ? (
                      <X className="h-3.5 w-3.5" style={{ display: 'inline', color: 'rgba(244,238,231,0.4)' }} strokeWidth={2.2} />
                    ) : (
                      r.old
                    )}
                  </div>
                  <div style={{ padding: '13px 14px', textAlign: 'center', borderLeft: '1px solid rgba(244,238,231,0.12)', color: '#FFB020' }}>
                    {r.neoIcon === 'check' ? (
                      <Check className="h-3.5 w-3.5" style={{ display: 'inline', color: MOLTEN }} strokeWidth={2.6} />
                    ) : (
                      r.neo
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Trust ── */}
      <section
        className="cb-sec"
        style={{ background: PAPER2, borderTop: '1px solid rgba(22,16,10,0.10)', borderBottom: '1px solid rgba(22,16,10,0.10)' }}
      >
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#E04A12' }}>Trust &amp; security</span>
            <h2 className="cb-h2" style={{ fontSize: 'clamp(1.5rem,3.2vw,2rem)', marginTop: 12 }}>
              Built so the structure is the trust.
            </h2>
          </Reveal>
          <div className="cb-grid-2" style={{ marginTop: 22 }}>
            {TRUST.map((f, i) => (
              <Reveal key={f.t} delay={i * 70}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: 'rgba(255,90,31,0.1)',
                      color: '#E04A12',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <f.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <div className="cb-disp" style={{ fontWeight: 500, fontSize: 14 }}>{f.t}</div>
                    <p className="cb-lead" style={{ fontSize: 13, marginTop: 3 }}>{f.b}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="cb-sec" style={{ background: PAPER }}>
        <div className="cb-wrap" style={{ textAlign: 'center' }}>
          <Reveal>
            <span className="cb-kick" style={{ color: '#E04A12' }}>Pricing</span>
            <h2 className="cb-h2" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.1rem)', marginTop: 12 }}>
              Free. Actually free.
            </h2>
            <p className="cb-lead" style={{ marginTop: 10, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
              No subscription, no per-auction fee, and we don’t take a cut of your deals. Verify your GSTIN and start
              trading.
            </p>
          </Reveal>
          <Reveal delay={90}>
            <div
              style={{
                maxWidth: 360,
                margin: '24px auto 0',
                background: INK,
                borderRadius: 16,
                padding: 26,
                textAlign: 'left',
              }}
            >
              <div className="cb-kick" style={{ color: '#FFB020' }}>For buyers &amp; sellers</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                <span className="cb-disp" style={{ color: '#F4EEE7', fontWeight: 700, fontSize: 46 }}>₹0</span>
                <span style={{ color: 'rgba(244,238,231,0.55)', fontSize: 13 }}>/ forever</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '18px 0' }}>
                {[
                  'Unlimited requirements & bids',
                  'Blind reverse auctions',
                  'GST verification included',
                  'Full audit trail & export',
                ].map((s) => (
                  <div key={s} style={{ display: 'flex', gap: 9, color: '#F4EEE7', fontSize: 13 }}>
                    <Check className="h-4 w-4" style={{ color: MOLTEN, flexShrink: 0 }} strokeWidth={2.6} />
                    {s}
                  </div>
                ))}
              </div>
              <Link
                className="cb-btn cb-btn--molten"
                href="/signup"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                Get started free
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="cb-sec" style={{ background: PAPER2, borderTop: '1px solid rgba(22,16,10,0.10)' }}>
        <div className="cb-wrap">
          <Reveal>
            <span className="cb-kick" style={{ color: '#E04A12' }}>FAQ</span>
            <h2 className="cb-h2" style={{ fontSize: 'clamp(1.5rem,3.2vw,2rem)', marginTop: 12 }}>
              Questions buyers and sellers ask first.
            </h2>
          </Reveal>
          <div style={{ marginTop: 20 }}>
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 50}>
                <div style={{ padding: '16px 0', borderBottom: i < FAQ.length - 1 ? '1px solid rgba(22,16,10,0.10)' : 'none' }}>
                  <div className="cb-disp" style={{ fontWeight: 500, fontSize: 14 }}>{f.q}</div>
                  <p className="cb-lead" style={{ fontSize: 13.5, marginTop: 5 }}>{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: MOLTEN, padding: '52px 24px', textAlign: 'center' }}>
        <div className="cb-wrap">
          <h2 className="cb-disp" style={{ color: '#1A0E06', fontWeight: 700, fontSize: 'clamp(1.5rem,3.4vw,2rem)', letterSpacing: '-0.02em' }}>
            Verify your GSTIN. Post your first requirement today.
          </h2>
          <p style={{ color: '#5A2A14', fontSize: 14, marginTop: 10 }}>
            Setup takes minutes. Qualified sellers can bid the same day.
          </p>
          <Link className="cb-btn cb-btn--dark" href="/signup" style={{ marginTop: 22, padding: '13px 24px' }}>
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: INK, padding: '44px 24px 28px' }}>
        <div className="cb-wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 24 }}>
            <div style={{ gridColumn: 'span 1', minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: MOLTEN,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1A0E06',
                  }}
                >
                  <LogoMark className="h-[13px] w-[13px]" />
                </span>
                <span className="cb-disp" style={{ color: '#F4EEE7', fontWeight: 700, fontSize: 15 }}>ChemiBid</span>
              </div>
              <p style={{ color: 'rgba(244,238,231,0.55)', fontSize: 12, lineHeight: 1.6, marginTop: 10, maxWidth: 240 }}>
                GST-anchored blind reverse auctions for chemical procurement in India.
              </p>
            </div>
            <FooterCol title="Product" links={[['How it works', '#how'], ['For buyers', '#buyers'], ['For sellers', '#sellers'], ['Pricing', '#pricing']]} />
            <FooterCol title="Company" links={[['About', '#'], ['Contact', '#']]} />
            <FooterCol title="Legal" links={[['Privacy', '/privacy'], ['Terms', '/terms']]} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 26,
              paddingTop: 16,
              borderTop: '1px solid rgba(244,238,231,0.12)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <span
              className="cb-chip"
              style={{ background: 'rgba(255,90,31,0.1)', color: '#FFB020', fontSize: 10.5 }}
            >
              <ShieldCheck className="h-3 w-3" /> GST-verified marketplace
            </span>
            <span className="cb-mono" style={{ color: 'rgba(244,238,231,0.55)', fontSize: 10.5 }}>
              © 2026 Two Clicks Media · ChemiBid
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Bubble({ side, children }: { side: 'in' | 'out'; children: React.ReactNode }) {
  const isIn = side === 'in';
  return (
    <div
      style={{
        alignSelf: isIn ? 'flex-start' : 'flex-end',
        background: isIn ? '#241A12' : '#2E5C3A',
        color: isIn ? 'rgba(244,238,231,0.55)' : '#CFE9D4',
        fontSize: 11.5,
        padding: '7px 10px',
        borderRadius: isIn ? '9px 9px 9px 2px' : '9px 9px 2px 9px',
        maxWidth: '85%',
      }}
    >
      {children}
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="cb-kick" style={{ color: 'rgba(244,238,231,0.55)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {links.map(([label, href]) => (
          <Link key={label} className="cb-navlink" href={href}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
