'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { requestResetAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(requestResetAction, null);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[13px] bg-graphite text-live">
          <Gavel className="h-[22px] w-[22px]" />
        </span>
        <CardTitle className="font-display text-2xl tracking-tight">Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to choose a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.success ? (
            <Alert variant="success">
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <SubmitButton className="w-full">Send reset link</SubmitButton>
        </form>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Each reset link is single-use — older emails stop working once you request a new one, so
          always open the most recent link.
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
