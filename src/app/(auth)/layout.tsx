import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-5xl">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
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
    </div>
  );
}
