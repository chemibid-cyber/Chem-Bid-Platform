'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { respondToCounterProposalAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Buyer's respond controls for one pending seller counter-proposal (#21).
 * Accept records the agreed term modification for this seller (it does NOT
 * rewrite the auction base spec). Reject keeps the original requirement.
 * Disabled-while-pending guards against a double submit.
 */
export function CounterProposalControls({ proposalId }: { proposalId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  function respond(decision: 'accepted' | 'rejected') {
    if (pending) return;
    start(async () => {
      setError(null);
      const res = await respondToCounterProposalAction(proposalId, decision, note || undefined);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-1.5">
        <Label htmlFor={`note-${proposalId}`} className="text-xs">
          Response note (optional — shown to the seller)
        </Label>
        <textarea
          id={`note-${proposalId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={pending}
          className="flex w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
          placeholder="e.g. We can accept 4 MT but need it within 10 days."
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="success" size="sm" disabled={pending} onClick={() => respond('accepted')}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Accept changes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={pending}
          onClick={() => respond('rejected')}
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
