'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { updatePasswordAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The new-password form. It carries the one-time `token_hash` from the email link
 * as hidden fields; the token is only verified when this form is submitted (in
 * updatePasswordAction), so inbox link-scanners that pre-open the link can't burn it.
 */
export function ResetPasswordForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [state, action] = useFormState(updatePasswordAction, null);

  // The token-related failures from updatePasswordAction all mention "expired";
  // when that's the cause, point the user straight at a fresh reset link.
  const linkExpired = Boolean(state?.error && /expired/i.test(state.error));

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[13px] bg-graphite text-live">
          <Gavel className="h-[22px] w-[22px]" />
        </span>
        <CardTitle className="font-display text-2xl tracking-tight">
          Choose a new password
        </CardTitle>
        <CardDescription>Enter a strong password to finish resetting.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription className="space-y-2">
                <span className="block">{state.error}</span>
                {linkExpired ? (
                  <Link
                    href="/forgot-password"
                    className="inline-flex font-medium underline underline-offset-2"
                  >
                    Request a new reset link
                  </Link>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters, with 3 of: lowercase, uppercase, number, symbol.
            </p>
          </div>
          <SubmitButton className="w-full">Update password</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
