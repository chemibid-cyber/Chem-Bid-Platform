import { Gavel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AcceptInviteForm } from './accept-form';

export const metadata = { title: 'Accept invite' };

/**
 * Server component: pulls the one-time `token_hash` (+ type) out of the invite link
 * URL and hands them to the client form as hidden fields. It does NOT require a
 * pre-existing session — the invited user isn't logged in yet. The token is only
 * verified when the form is submitted (see acceptInviteAction), so email
 * link-scanners can't consume the single-use token on load. Mirrors the
 * password-reset page in (auth)/reset-password/page.tsx.
 */
export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tokenHash = typeof searchParams.token_hash === 'string' ? searchParams.token_hash : '';
  const type = typeof searchParams.type === 'string' ? searchParams.type : 'invite';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-6 flex items-center gap-2 font-semibold">
        <Gavel className="h-5 w-5" /> Chemical Auction
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Welcome aboard</CardTitle>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm tokenHash={tokenHash} type={type} />
        </CardContent>
      </Card>
    </div>
  );
}
