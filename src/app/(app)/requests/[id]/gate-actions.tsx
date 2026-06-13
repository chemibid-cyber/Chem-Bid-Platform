'use client';

import { useState, useTransition } from 'react';
import { Download, Loader2, Check, EyeOff, Ban } from 'lucide-react';
import {
  acceptRequestAction,
  ignoreRequestAction,
  unignoreRequestAction,
  blockPurchaserAction,
  withdrawBidAction,
  getRequestSpecUrlAction,
} from '../actions';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-dialog';

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | null | undefined>) =>
    start(async () => setError((await fn())?.error ?? null));
  return { pending, error, run };
}

export function AcceptButton({ auctionId }: { auctionId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <Button disabled={pending} onClick={() => run(() => acceptRequestAction(auctionId))}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Accept &amp; quote
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function IgnoreButton({ auctionId, ignored }: { auctionId: string; ignored: boolean }) {
  const { pending, run } = useAction();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => (ignored ? unignoreRequestAction(auctionId) : ignoreRequestAction(auctionId)))
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
      {ignored ? 'Un-ignore' : 'Ignore'}
    </Button>
  );
}

type BlockScope = 'this_cas' | 'all';
// null = permanent (#16).
const DURATIONS: { value: number | null; label: string }[] = [
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: null, label: 'Permanent' },
];

export function BlockControls({ auctionId }: { auctionId: string }) {
  const { pending, run } = useAction();
  const [scope, setScope] = useState<BlockScope>('this_cas');
  // Track via index so "Permanent" (null) is selectable without a sentinel value.
  const [durIndex, setDurIndex] = useState(0);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
        <Ban className="h-4 w-4" /> Block this purchaser
      </summary>
      <div className="mt-2 flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Scope</span>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`block-scope-${auctionId}`}
                checked={scope === 'this_cas'}
                onChange={() => setScope('this_cas')}
                disabled={pending}
              />
              This CAS only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`block-scope-${auctionId}`}
                checked={scope === 'all'}
                onChange={() => setScope('all')}
                disabled={pending}
              />
              All requests
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Duration</span>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d, i) => (
              <label
                key={d.label}
                className="flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-sm has-[:checked]:border-destructive has-[:checked]:bg-destructive/10"
              >
                <input
                  type="radio"
                  name={`block-duration-${auctionId}`}
                  checked={durIndex === i}
                  onChange={() => setDurIndex(i)}
                  disabled={pending}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => run(() => blockPurchaserAction(auctionId, scope, DURATIONS[durIndex].value))}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Block purchaser
        </Button>
      </div>
    </details>
  );
}

export function WithdrawButton({ auctionId }: { auctionId: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive"
      title="Withdraw your bid?"
      description="Your bid stays in the audit trail but is removed from ranking. You can re-bid while the auction is still open."
      confirmLabel="Withdraw bid"
      destructive
      onConfirm={async () => {
        const res = await withdrawBidAction(auctionId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      Withdraw bid
    </ConfirmButton>
  );
}

export function SellerSpecDownload({ auctionId }: { auctionId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await getRequestSpecUrlAction(auctionId);
            if (res.url) window.open(res.url, '_blank');
            else setError(res.error ?? 'Could not open file.');
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Spec sheet
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
