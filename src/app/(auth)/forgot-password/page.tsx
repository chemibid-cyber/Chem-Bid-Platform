'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { requestResetAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(requestResetAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
