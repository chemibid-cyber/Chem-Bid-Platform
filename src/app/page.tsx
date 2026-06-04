import Link from 'next/link';
import { ShieldCheck, Gavel, FileLock2, Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'GST-verified identity',
    body: 'Every counterparty is a real, tax-registered business. Legal name and address come from the GST network and are locked.',
  },
  {
    icon: Gavel,
    title: 'Blind reverse auctions',
    body: 'Post a precise requirement; qualified sellers compete to your exact spec. Sellers see only their own rank — never a competitor’s price.',
  },
  {
    icon: Search,
    title: 'CAS-precise targeting',
    body: 'Requirements are anchored to a CAS number, purity and quantity. Only sellers who actually carry the product get notified.',
  },
  {
    icon: FileLock2,
    title: 'Append-only audit trail',
    body: 'Every bid, counter, accept and close is recorded immutably — so there is always a record of why a deal was struck.',
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-semibold">
          <Gavel className="h-5 w-5" />
          Chemical Auction
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            Create account
          </Link>
        </nav>
      </header>

      <section className="py-16 sm:py-24">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          B2B chemical procurement · India
        </p>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Turn the six-call scramble into a structured, auditable, blind reverse auction.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Buyers post a precise requirement — CAS number, purity, quantity, packing. Qualified
          sellers bid blindly and competitively. A two-stage negotiation settles a price, and every
          action is recorded.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
            Get started — verify your GSTIN
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            I already have an account
          </Link>
        </div>
      </section>

      <section className="grid gap-5 pb-20 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
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
