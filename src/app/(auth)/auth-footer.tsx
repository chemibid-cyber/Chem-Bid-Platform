import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Shared Terms/Privacy line for the auth screens. Plain component — usable in
 *  both server (signup/reset) and client (login/forgot) trees. */
export function AuthFooter({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      By continuing you agree to our{' '}
      <Link href="/terms" className="text-brand hover:underline">
        Terms
      </Link>{' '}
      and{' '}
      <Link href="/privacy" className="text-brand hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
