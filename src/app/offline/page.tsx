import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <WifiOff className="h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Chemical Auction needs a connection for live bidding. Reconnect and we&apos;ll pick up
        where you left off — your auction timers are server-side, so nothing is lost.
      </p>
    </div>
  );
}
