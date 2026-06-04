import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { logOutAction } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const REASONS: Record<string, { title: string; body: string }> = {
  disabled: {
    title: 'Your account is disabled',
    body: 'Your company Admin has disabled this account. Please contact them to be re-enabled.',
  },
  suspended: {
    title: 'Company account suspended',
    body: 'This company account has been suspended by the platform operator. Contact support to resolve it.',
  },
};

export default function BlockedPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = REASONS[searchParams.reason ?? 'disabled'] ?? REASONS.disabled!;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <ShieldAlert className="h-7 w-7 text-destructive" />
          <CardTitle className="mt-2">{reason.title}</CardTitle>
          <CardDescription>{reason.body}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <form action={logOutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
          <Link href="/">
            <Button variant="ghost">Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
