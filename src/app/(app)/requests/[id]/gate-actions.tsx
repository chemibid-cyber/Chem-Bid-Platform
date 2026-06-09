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

export function BlockControls({ auctionId }: { auctionId: string }) {
  const { pending, run } = useAction();
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
        <Ban className="h-4 w-4" /> Block this purchaser
      </summary>
      <div className="mt-2 flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => blockPurchaserAction(auctionId, 'this_cas'))}
        >
          Block for this CAS only
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => run(() => blockPurchaserAction(auctionId, 'all'))}
        >
          Block for all requests
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
