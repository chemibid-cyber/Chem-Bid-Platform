'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { Gavel, Check } from 'lucide-react';
import { logInAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action] = useFormState(logInAction, initialError ? { error: initialError } : null);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid md:grid-cols-2">
        {/* Brand panel — the one bold dark moment */}
        <div className="hidden flex-col justify-between bg-graphite p-10 text-white md:flex">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand text-white">
              <Gavel className="h-[17px] w-[17px]" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Chemical Auction
            </span>
          </div>
          <div>
            <h2 className="font-display text-[27px] font-bold leading-[1.18] tracking-tight text-white">
              Every account is a real, GST-verified business.
            </h2>
            <p className="mt-3.5 max-w-[42ch] text-sm leading-relaxed text-white/70">
              You always know who is on the other side of the table before you reveal a price.
            </p>
          </div>
          <div className="flex items-center gap-2.5 text-[12.5px] text-white/70">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-live/15 text-live">
              <Check className="h-3 w-3" strokeWidth={2.4} />
            </span>
            12,400+ verified GSTINs trading
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-8 md:p-11">
          {/* Brand mark for mobile (brand panel is hidden on small screens) */}
          <span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-[13px] bg-graphite text-live md:hidden">
            <Gavel className="h-[22px] w-[22px]" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Enter your corporate email.
          </p>
          <form action={action} className="mt-6 space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            <SubmitButton className="w-full">Log in</SubmitButton>
          </form>
          <p className="mt-5 text-sm text-muted-foreground">
            New supplier or buyer?{' '}
            <Link href="/signup" className="font-semibold text-brand hover:underline">
              Apply with your GSTIN
            </Link>
          </p>
        </div>
      </div>
    </Card>
  );
}
