'use client';

import { useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { Ban, Check } from 'lucide-react';
import { confirmDealAction, blockSellerAction, type AuctionFormState } from '../../actions';
import { ConfirmButton, ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ConfirmDealForm({
  auctionId,
  bidId,
  sellerName,
}: {
  auctionId: string;
  bidId: string;
  sellerName: string;
}) {
  const [state, action] = useFormState<AuctionFormState, FormData>(confirmDealAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div>
      {/* Hidden form keeps useFormState's redirect + error handling; the styled
          dialog triggers it via requestSubmit() instead of a native confirm(). */}
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="auctionId" value={auctionId} />
        <input type="hidden" name="bidId" value={bidId} />
      </form>
      {state?.error ? (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <ConfirmButton
        variant="success"
        size="sm"
        title={`Confirm the deal with ${sellerName}?`}
        description="This records the mutual intent of both parties under your signup Terms and closes the auction. It is not an automatically enforceable contract."
        confirmLabel="Confirm deal"
        onConfirm={() => formRef.current?.requestSubmit()}
      >
        <Check className="h-4 w-4" /> Confirm deal
      </ConfirmButton>
    </div>
  );
}

type BlockScope = 'this_cas' | 'all';

/** Duration choices map to a months value, or null for a permanent block (#16). */
const DURATION_OPTIONS: { value: string; label: string; months: number | null }[] = [
  { value: '1', label: '1 month', months: 1 },
  { value: '3', label: '3 months', months: 3 },
  { value: '6', label: '6 months', months: 6 },
  { value: 'permanent', label: 'Permanent', months: null },
];

export function BlockSellerButton({
  auctionId,
  sellerCompanyId,
}: {
  auctionId: string;
  sellerCompanyId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<BlockScope>('this_cas');
  const [duration, setDuration] = useState<string>('permanent');

  function reset() {
    setScope('this_cas');
    setDuration('permanent');
    setError(null);
  }

  async function run() {
    if (pending) return; // guard against a double-submit
    setPending(true);
    setError(null);
    try {
      const months = DURATION_OPTIONS.find((d) => d.value === duration)?.months ?? null;
      const res = await blockSellerAction(auctionId, sellerCompanyId, scope, months);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Ban className="h-4 w-4" /> Block seller
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Block this seller?"
        description={
          <div className="space-y-3">
            <p>
              They&apos;ll be muted for your future requirements per the scope below. Their existing
              bid stays in the audit trail.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="blockScope">Scope</Label>
              <Select
                id="blockScope"
                value={scope}
                onChange={(e) => setScope(e.target.value as BlockScope)}
                disabled={pending}
              >
                <option value="this_cas">This CAS only</option>
                <option value="all">All products</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blockDuration">Duration</Label>
              <Select
                id="blockDuration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={pending}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
        confirmLabel="Block seller"
        destructive
        pending={pending}
        error={error}
        onConfirm={run}
      />
    </>
  );
}
