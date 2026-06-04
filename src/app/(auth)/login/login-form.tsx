'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { logInAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action] = useFormState(logInAction, initialError ? { error: initialError } : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back. Enter your corporate email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
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
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton className="w-full">Log in</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create a company account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
