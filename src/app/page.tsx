import Link from 'next/link';
import { ShieldCheck, Search, FileLock2, ArrowRight, Check } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { LogoTile } from '@/components/brand/logo';
import { Reveal } from '@/components/brand/reveal';
import { LiveBoard } from '@/components/brand/live-board';
import { Ticker } from '@/components/brand/ticker';
import { HexField } from '@/components/brand/hex-field';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    n: 1,
    title: 'Post a requirement',
    body: 'CAS number, purity, quantity, packing, deadline. Under five minutes.',
  },
  {
    n: 2,
    title: 'Sellers bid blindly',
    body: 'Only qualified sellers are invited. Each sees just their own rank — never a rival’s price.',
  },
  {
    n: 3,
    title: 'Settle & record',
    body: 'Negotiate one round, confirm a single winner, keep a tamper-proof record.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <LogoTile className="h-8 w-8 rounded-[9px]" />
            <span className="font-display text-lg font-bold tracking-tight">ChemiBid</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Log in
            </Link>
            <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
              Create account
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero (with drifting molecular backdrop) ── */}
      <section className="relative overflow-hidden">
        <HexField />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              B2B chemical procurement · India
            </span>
            <h1 className="mt-5 text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.75rem]">
              Price discovery, without the leak.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              The six-call scramble, turned into a structured, auditable, blind reverse auction.
              Qualified sellers bid competitively — each sees only their own rank, never a rival’s
              price.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
                Get started — verify your GSTIN <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                I already have an account
              </Link>
            </div>
            <div className="mt-7 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              12,400+ GST-verified businesses trading
            </div>
          </Reveal>

          {/* The signature: a live blind auction */}
          <Reveal delay={120} className="lg:justify-self-end">
            <LiveBoard />
          </Reveal>
        </div>
      </section>

      {/* ── Live ticker tape (full-bleed band) ── */}
      <Ticker />

      <main className="mx-auto max-w-6xl px-6">
        {/* ── How it works ── */}
        <section className="py-14">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-tight">How it works</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative h-full rounded-2xl bg-card p-6 shadow-card">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-graphite font-display text-sm font-bold text-live">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Why it's different (bento) ── */}
        <section className="py-14">
          <Reveal>
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight">
              Built for procurement that needs proof, not promises.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <div className="flex h-full flex-col justify-between rounded-2xl bg-graphite p-7 text-white shadow-card">
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight">
                    Blind reverse auctions
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
                    Qualified sellers compete to your exact spec. Each sees only their own rank,
                    never a competitor’s price or identity. Price discovery without the leak.
                  </p>
                </div>
                <div className="mt-6 space-y-2">
                  {[
                    { rank: '#1', label: 'Seller A', mine: false },
                    { rank: '#2', label: 'Seller B', mine: false },
                    { rank: '#3', label: 'You', mine: true },
                  ].map((r) => (
                    <div
                      key={r.rank}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        r.mine ? 'bg-live/15 text-white' : 'bg-white/[0.05] text-white/55',
                      )}
                    >
                      <span className="font-display font-bold tabular-nums">{r.rank}</span>
                      <span className={r.mine ? 'font-medium' : ''}>{r.label}</span>
                      <span className="ml-auto tabular-nums">
                        {r.mine ? '₹1,14,000 / MT' : '••••••'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="grid gap-5">
              {[
                {
                  icon: ShieldCheck,
                  title: 'GST-verified identity',
                  body: 'Every counterparty is a real, tax-registered business. Legal name and address come straight from the GST network.',
                },
                {
                  icon: Search,
                  title: 'CAS-precise targeting',
                  body: 'Requirements are anchored to a CAS number, purity and quantity — only sellers who actually carry it get notified.',
                },
                {
                  icon: FileLock2,
                  title: 'Append-only audit trail',
                  body: 'Every bid, counter, accept and close is recorded immutably. Always a clear record of why a deal was struck.',
                },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 80}>
                  <div className="h-full rounded-2xl bg-card p-5 shadow-card">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <f.icon className="h-[18px] w-[18px]" />
                    </span>
                    <h3 className="mt-3 font-display text-base font-bold tracking-tight">
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA band ── */}
        <section className="py-14">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-2xl bg-brand p-8 text-white shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                  Verify your GSTIN and post your first requirement.
                </h2>
                <p className="mt-2 text-sm text-white/80">
                  Setup takes minutes. Qualified sellers bid to your spec the same day.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-white/90"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-7 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoTile className="h-6 w-6 rounded-md" />
            <span className="font-display font-bold tracking-tight text-foreground">ChemiBid</span>
            <span className="ml-2">© Two Clicks Media</span>
          </div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
