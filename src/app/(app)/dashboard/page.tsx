import Link from 'next/link';
import { Plus, Package, Network, Users, Inbox, FileText } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getActiveMode } from '@/lib/auth/mode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };

const BUY_ACTIONS = [
  { href: '/auctions/new', label: 'Post a requirement', icon: Plus, desc: 'Launch a blind reverse auction in minutes.' },
  { href: '/catalog', label: 'Purchase catalog', icon: Package, desc: 'Track the chemicals you buy.' },
  { href: '/network', label: 'Vendor network', icon: Network, desc: 'Register trusted suppliers by GSTIN + CAS.' },
  { href: '/auctions', label: 'My auctions', icon: FileText, desc: 'Active, closed and unsuccessful requests.' },
];

const SELL_ACTIONS = [
  { href: '/requests', label: 'Incoming requests', icon: Inbox, desc: 'Accept & quote, ignore, or block.' },
  { href: '/catalog', label: 'Sales catalog', icon: Package, desc: 'List what you supply, with CAS + grade.' },
];

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const { user, company } = await requireUser();
  const mode = getActiveMode(user);
  const actions = mode === 'buy' ? BUY_ACTIONS : SELL_ACTIONS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {user.firstName}.
        </h1>
        <p className="text-muted-foreground">
          You&apos;re in <strong className="capitalize">{mode}</strong> mode for {company.legalName}.
        </p>
      </div>

      {searchParams.error === 'no_capability' ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="py-3 text-sm">
            You don&apos;t have that capability. Ask your Admin to enable it.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Card key={a.href} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <a.icon className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-base">{a.label}</CardTitle>
              <CardDescription>{a.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={a.href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Open
              </Link>
            </CardContent>
          </Card>
        ))}

        {user.isAdmin ? (
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-base">Members</CardTitle>
              <CardDescription>Invite colleagues and set buy/sell capabilities.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/members" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Manage
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
