'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { acceptInviteAction, type AcceptState } from './actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AcceptInviteForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [state, action] = useFormState<AcceptState, FormData>(acceptInviteAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <p className="text-sm text-muted-foreground">
        You&apos;ve been invited to join your company. Set a password to finish.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Create a password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">
          At least 8 characters, with 3 of: lowercase, uppercase, number, symbol.
        </p>
      </div>
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
        <Checkbox id="consent" name="consent" className="mt-0.5" required />
        <Label htmlFor="consent" className="text-sm font-normal leading-snug">
          I accept the{' '}
          <Link href="/terms" className="underline" target="_blank">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline" target="_blank">
            Privacy Policy
          </Link>
          .
        </Label>
      </div>
      <SubmitButton className="w-full">Set password &amp; continue</SubmitButton>
    </form>
  );
}
