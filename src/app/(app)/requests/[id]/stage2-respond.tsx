'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { stage2RespondAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Stage2Respond({
  auctionId,
  targetRate,
  stage1Total,
  unit,
  existing,
}: {
  auctionId: string;
  targetRate: string;
  stage1Total: string;
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

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        Buyer&apos;s counter: <span className="font-semibold">₹{targetRate}/{unit}</span>
        <span className="ml-2 text-muted-foreground">(your Stage-1 total: ₹{stage1Total}/{unit})</span>
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
          Accept ₹{targetRate}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => respond('reject')}>
          Reject (keep Stage-1)
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setShowFinal((v) => !v)}>
          Submit final rate
        </Button>
      </div>

      {showFinal ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="finalRate" className="text-xs">
              Final rate (≤ ₹{stage1Total})
            </Label>
            <Input
              id="finalRate"
              type="number"
              step="0.01"
              min="0"
              value={finalRate}
              onChange={(e) => setFinalRate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button disabled={pending || !finalRate} onClick={() => respond('final', finalRate)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </div>
      ) : null}
    </div>
  );
}
