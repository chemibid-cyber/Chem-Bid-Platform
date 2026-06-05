import Link from 'next/link';
import { ShieldCheck, Gavel, FileLock2, Search, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, title: 'Post a requirement', body: 'CAS, purity, quantity, packing, deadline. Under five minutes.' },
  { n: 2, title: 'Sellers bid blindly', body: 'Only qualified sellers are invited. Each sees just their own rank — never a rival’s price.' },
  { n: 3, title: 'Settle & record', body: 'Negotiate one round, confirm a single winner, and keep a tamper-proof record.' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'GST-verified identity',
    body: 'Every counterparty is a real, tax-registered business. Legal name and address come from the GST network and stay locked.',
  },
  {
    icon: Gavel,
    title: 'Blind reverse auctions',
    body: 'Qualified sellers compete to your exact spec. Sellers see only their own rank, never a competitor’s price or identity.',
  },
  {
    icon: Search,
    title: 'CAS-precise targeting',
    body: 'Requirements are anchored to a CAS number, purity and quantity, so only sellers who actually carry the product get notified.',
  },
  {
    icon: FileLock2,
    title: 'Append-only audit trail',
    body: 'Every bid, counter, accept and close is recorded immutably — always a clear record of why a deal was struck.',
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Gavel className="h-4 w-4" />
          </span>
          Chemical Auction
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ variant: 'brand', size: 'sm' }))}>
            Create account
          </Link>
        </nav>
      </header>

      <section className="py-16 sm:py-24">
        <p className="mb-4 inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
          B2B chemical procurement · India
        </p>
        <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          The six-call scramble, turned into a structured, auditable, blind reverse auction.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Buyers post a precise requirement. Qualified sellers bid blindly and competitively. A
          two-stage negotiation settles the price — and every action is recorded for good.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={cn(buttonVariants({ variant: 'brand', size: 'lg' }))}>
            Get started — verify your GSTIN <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            I already have an account
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
              {s.n}
            </span>
            <h2 className="mt-4 font-semibold tracking-tight">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 py-16 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border/70 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <f.icon className="h-6 w-6 text-brand" />
            <h2 className="mt-4 font-semibold tracking-tight">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t py-6 text-sm text-muted-foreground">
        <span>© Two Clicks Media</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
