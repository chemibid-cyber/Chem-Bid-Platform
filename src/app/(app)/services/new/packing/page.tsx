import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackingRequestForm } from './packing-form';

export const metadata = { title: 'Request packing material' };

export default async function NewPackingRequestPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to services
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">Request packing material</CardTitle>
          <CardDescription>
            Open identity: matching packing suppliers see your full corporate profile the moment you
            publish, and you see theirs the moment they quote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PackingRequestForm />
        </CardContent>
      </Card>
    </div>
  );
}
