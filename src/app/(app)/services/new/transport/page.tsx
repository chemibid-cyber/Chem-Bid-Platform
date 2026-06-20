import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransportRequestForm } from './transport-form';

export const metadata = { title: 'Request transport' };

export default async function NewTransportRequestPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to services
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">Request transport</CardTitle>
          <CardDescription>
            Open identity: matching transporters see your full corporate profile the moment you
            publish, and you see theirs the moment they quote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransportRequestForm />
        </CardContent>
      </Card>
    </div>
  );
}
