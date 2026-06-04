import Link from 'next/link';
import { Gavel } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
        <Gavel className="h-5 w-5" />
        Chemical Auction
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{' '}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
