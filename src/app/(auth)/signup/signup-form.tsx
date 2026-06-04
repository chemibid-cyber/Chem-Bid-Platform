'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { signUpAction } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SignupForm() {
  const [state, action] = useFormState(signUpAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your company account</CardTitle>
        <CardDescription>
          Your company identity is anchored to a verified GSTIN. The first person to register
          becomes the Admin and can both buy and sell.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="gstin">Company GSTIN</Label>
            <Input
              id="gstin"
              name="gstin"
              placeholder="27AAPFU0939F1ZV"
              autoCapitalize="characters"
              maxLength={15}
              required
            />
            <p className="text-xs text-muted-foreground">
              15 characters. We fetch and lock your legal name and address from the GST network.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Corporate email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" name="designation" placeholder="e.g. Procurement Lead" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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

          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <Checkbox id="consent" name="consent" className="mt-0.5" required />
            <Label htmlFor="consent" className="text-sm font-normal leading-snug">
              I accept the{' '}
              <Link href="/terms" className="underline" target="_blank">
                Terms &amp; Conditions
              </Link>{' '}
              (including the Deal Confirmation Record terms) and consent to processing of my data
              under the{' '}
              <Link href="/privacy" className="underline" target="_blank">
                Privacy Policy
              </Link>{' '}
              (DPDP).
            </Label>
          </div>

          <SubmitButton className="w-full">Verify GSTIN &amp; create account</SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
