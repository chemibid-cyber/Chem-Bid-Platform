'use client';

import { useFormState } from 'react-dom';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { BadgeCheck, Clock, Loader2, Search } from 'lucide-react';
import { signUpAction, verifyGstinAction, type GstPreview } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SignupForm() {
  const [state, action] = useFormState(signUpAction, null);
  const [gstin, setGstin] = useState('');
  const [accountType, setAccountType] = useState<'trading' | 'provider'>('trading');
  const [preview, setPreview] = useState<GstPreview | null>(null);
  const [verifying, startVerify] = useTransition();

  function verify() {
    const value = gstin.trim().toUpperCase();
    if (!value) return;
    startVerify(async () => setPreview(await verifyGstinAction(value)));
  }

  const confirmed = preview?.ok === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your company account</CardTitle>
        <CardDescription>
          Your identity is anchored to a verified GSTIN. The first person to register becomes the
          Admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 0 — what kind of company */}
        <div className="mb-5 space-y-2">
          <Label>What does your company do?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors ${
                accountType === 'trading' ? 'border-brand bg-brand/5' : 'hover:bg-muted/40'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="accountTypePick"
                  checked={accountType === 'trading'}
                  onChange={() => setAccountType('trading')}
                  className="accent-primary"
                />
                We trade chemicals
              </span>
              <span className="text-muted-foreground">
                Buy or sell chemicals through blind reverse auctions.
              </span>
            </label>
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors ${
                accountType === 'provider' ? 'border-brand bg-brand/5' : 'hover:bg-muted/40'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="accountTypePick"
                  checked={accountType === 'provider'}
                  onChange={() => setAccountType('provider')}
                  className="accent-primary"
                />
                We provide services
              </span>
              <span className="text-muted-foreground">
                Transport (tankers, trucks) or packing material — quote on open-identity inquiries.
              </span>
            </label>
          </div>
        </div>

        {/* Step 1 — verify GSTIN */}
        <div className="space-y-2">
          <Label htmlFor="gstinInput">Company GSTIN</Label>
          <div className="flex gap-2">
            <Input
              id="gstinInput"
              value={gstin}
              onChange={(e) => {
                setGstin(e.target.value.toUpperCase());
                setPreview(null);
              }}
              placeholder="27AAPFU0939F1ZV"
              maxLength={15}
              autoCapitalize="characters"
            />
            <Button type="button" variant="outline" onClick={verify} disabled={verifying}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Verify
            </Button>
          </div>
          {preview && !preview.ok ? (
            <Alert variant="destructive">
              <AlertDescription>{preview.error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        {/* Step 2 — confirm fetched identity + details */}
        {confirmed ? (
          <form action={action} className="mt-5 space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                {preview?.status === 'verified' ? (
                  <>
                    <BadgeCheck className="h-4 w-4 text-success" /> Verified on the GST network
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-warning" /> Provisional — verification pending
                  </>
                )}
              </div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Legal name</p>
              <p className="font-semibold">{preview?.legalName || '—'}</p>
              {preview?.address ? (
                <>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Address</p>
                  <p className="text-sm">{preview.address}</p>
                </>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                This identity is locked and cannot be hand-edited.
              </p>
            </div>

            <input type="hidden" name="gstin" value={gstin} />
            <input type="hidden" name="accountType" value={accountType} />

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
                  Terms &amp; Conditions
                </Link>{' '}
                (incl. the Deal Confirmation Record terms) and consent to data processing under the{' '}
                <Link href="/privacy" className="underline" target="_blank">
                  Privacy Policy
                </Link>{' '}
                (DPDP).
              </Label>
            </div>

            <SubmitButton className="w-full">Create account</SubmitButton>
          </form>
        ) : null}

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
