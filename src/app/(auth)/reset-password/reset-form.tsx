'use client';

import { useFormState } from 'react-dom';
import { updatePasswordAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Enter a strong password to finish resetting.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
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
