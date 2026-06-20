'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { stage2RespondAction } from '../actions';
import { formatRate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Stage2Respond({
  auctionId,
  targetRate,
  stage1Material,
  addOn,
  unit,
  existing,
}: {
  auctionId: string;
  /** Buyer's counter, on the MATERIAL rate. */
  targetRate: string;
  /** This seller's Stage-1 material (basic) rate. */
  stage1Material: string;
  /** Carried-over transport + tax (₹/unit) from the seller's Stage-1 bid. */
  addOn: number;
  unit: string;
  existing: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [finalRate, setFinalRate] = useState('');

  function respond(action: 'accept' | 'reject' | 'final', rate?: string) {
    start(async () => {
      const res = await stage2RespondAction(auctionId, action, rate);
      setError(res?.error ?? null);
    });
  }

  const acceptAllIn = Number(targetRate || 0) + addOn;
  const finalAllIn = Number(finalRate || 0) + addOn;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-accent p-4 text-sm">
        Buyer&apos;s counter on the <strong>material rate</strong>:{' '}
        <span className="font-semibold tabular-nums">₹{targetRate}/{unit}</span>
        <span className="ml-2 text-muted-foreground">
          (your Stage-1 material: <span className="tabular-nums">₹{stage1Material}/{unit}</span> · your transport + tax of{' '}
          <span className="tabular-nums">₹{formatRate(addOn)}/{unit}</span> carry over unchanged)
        </span>
      </div>
      {existing ? (
        <Alert variant="success">
          <AlertDescription>
            Your Stage-2 response is recorded{existing === 'reject' ? ' (rejected — Stage-1 stands)' : `: ${existing}`}.
            You can change it until the window closes.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => respond('accept')}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span className="tabular-nums">Accept ₹{targetRate} (all-in ₹{formatRate(acceptAllIn)})</span>
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => respond('reject')}>
          Reject (keep Stage-1)
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setShowFinal((v) => !v)}>
          Submit final material rate
        </Button>
      </div>

      {showFinal ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-accent p-4">
          <div className="space-y-1">
            <Label htmlFor="finalRate" className="text-xs">
              Final material rate (≤ <span className="tabular-nums">₹{stage1Material}</span>)
            </Label>
            <DecimalInput
              id="finalRate"
              maxDecimals={2}
              min="0"
              value={finalRate}
              onChange={(e) => setFinalRate(e.target.value)}
              className="w-40"
            />
          </div>
          {finalRate ? (
            <p className="pb-2 text-xs tabular-nums text-muted-foreground">
              All-in: ₹{formatRate(finalAllIn)}/{unit}
            </p>
          ) : null}
          <Button disabled={pending || !finalRate} onClick={() => respond('final', finalRate)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </div>
      ) : null}
    </div>
  );
}
