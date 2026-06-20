'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { counterProposeAction, withdrawCounterProposalAction, type BidFormState } from '../actions';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LOGISTICS_BASIS_LABEL, UNIT_LABEL, formatIST } from '@/lib/format';

/** Current values come from the auction, pre-filled so the seller edits the real spec. */
export type CounterPrefill = {
  quantity: string;
  unit: 'kg' | 'mt' | 'l';
  packing: string;
  logisticsBasis: 'delivered' | 'exworks' | 'other';
  deliveryAddress: string;
  /** datetime-local pre-fill strings ("YYYY-MM-DDTHH:mm") or '' if unset. */
  offerValidUntilLocal: string;
  supplyValidUntilLocal: string;
};

export type CurrentProposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  proposedQuantity: string | null;
  proposedUnit: 'kg' | 'mt' | 'l' | null;
  proposedPacking: string | null;
  proposedLogisticsBasis: 'delivered' | 'exworks' | 'other' | null;
  proposedDeliveryAddress: string | null;
  proposedOfferValidUntil: string | null; // ISO
  proposedSupplyValidUntil: string | null; // ISO
  note: string | null;
  buyerResponseNote: string | null;
};

function StatusBanner({ proposal }: { proposal: CurrentProposal }) {
  if (proposal.status === 'accepted') {
    return (
      <Alert variant="success">
        <AlertDescription>
          The buyer <strong>accepted</strong> your proposed changes. These are the agreed terms for
          your supply on this requirement.
          {proposal.buyerResponseNote ? (
            <span className="mt-1 block text-muted-foreground">“{proposal.buyerResponseNote}”</span>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }
  if (proposal.status === 'rejected') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          The buyer <strong>declined</strong> your proposed changes — the original requirement
          stands. You may submit a new proposal below.
          {proposal.buyerResponseNote ? (
            <span className="mt-1 block">“{proposal.buyerResponseNote}”</span>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

function ProposedSummary({ proposal }: { proposal: CurrentProposal }) {
  const rows: { label: string; value: string }[] = [];
  if (proposal.proposedQuantity)
    rows.push({
      label: 'Quantity',
      value: `${proposal.proposedQuantity} ${proposal.proposedUnit ? UNIT_LABEL[proposal.proposedUnit] ?? proposal.proposedUnit : ''}`.trim(),
    });
  else if (proposal.proposedUnit)
    rows.push({ label: 'Unit', value: UNIT_LABEL[proposal.proposedUnit] ?? proposal.proposedUnit });
  if (proposal.proposedPacking) rows.push({ label: 'Packing', value: proposal.proposedPacking });
  if (proposal.proposedLogisticsBasis)
    rows.push({
      label: 'Delivery terms',
      value: LOGISTICS_BASIS_LABEL[proposal.proposedLogisticsBasis] ?? proposal.proposedLogisticsBasis,
    });
  if (proposal.proposedDeliveryAddress)
    rows.push({ label: 'Delivery address', value: proposal.proposedDeliveryAddress });
  if (proposal.proposedOfferValidUntil)
    rows.push({ label: 'Offer valid until', value: formatIST(proposal.proposedOfferValidUntil) });
  if (proposal.proposedSupplyValidUntil)
    rows.push({ label: 'Supply valid until', value: formatIST(proposal.proposedSupplyValidUntil) });

  return (
    <div className="rounded-xl bg-accent p-4 text-sm">
      <p className="mb-2 font-medium">Your proposed changes</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No field changes — note only.</p>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{r.label}</dt>
              <dd className="font-medium tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {proposal.note ? (
        <p className="mt-2 border-t pt-2 text-muted-foreground">Note: {proposal.note}</p>
      ) : null}
    </div>
  );
}

export function CounterProposalForm({
  auctionId,
  prefill,
  current,
}: {
  auctionId: string;
  prefill: CounterPrefill;
  current: CurrentProposal | null;
}) {
  const [state, action] = useFormState<BidFormState, FormData>(counterProposeAction, null);

  const pending = current?.status === 'pending';

  return (
    <div className="space-y-4">
      {current ? <StatusBanner proposal={current} /> : null}

      {pending && current ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="warning">Pending buyer review</Badge>
          </div>
          <ProposedSummary proposal={current} />
          <WithdrawProposalButton proposalId={current.id} />
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="auctionId" value={auctionId} />
          <p className="text-sm text-muted-foreground">
            Suggest revised terms for this requirement. Leave a field unchanged to keep the
            buyer&apos;s value. Your bid stays full-quantity — this only changes the spec if the
            buyer approves it.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="proposedQuantity">Quantity</Label>
              <DecimalInput
                id="proposedQuantity"
                name="proposedQuantity"
                maxDecimals={2}
                min="0"
                defaultValue={prefill.quantity}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposedUnit">Unit</Label>
              <Select id="proposedUnit" name="proposedUnit" defaultValue={prefill.unit}>
                <option value="kg">kg</option>
                <option value="mt">MT</option>
                <option value="l">L</option>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="proposedPacking">Packing</Label>
              <Input
                id="proposedPacking"
                name="proposedPacking"
                defaultValue={prefill.packing}
                placeholder="e.g. 50 kg HDPE drums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposedLogisticsBasis">Delivery terms</Label>
              <Select
                id="proposedLogisticsBasis"
                name="proposedLogisticsBasis"
                defaultValue={prefill.logisticsBasis}
              >
                <option value="delivered">{LOGISTICS_BASIS_LABEL.delivered}</option>
                <option value="exworks">{LOGISTICS_BASIS_LABEL.exworks}</option>
                <option value="other">{LOGISTICS_BASIS_LABEL.other}</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposedDeliveryAddress">Delivery address</Label>
              <Input
                id="proposedDeliveryAddress"
                name="proposedDeliveryAddress"
                defaultValue={prefill.deliveryAddress}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposedOfferValidUntil">Offer valid until (IST)</Label>
              <Input
                id="proposedOfferValidUntil"
                name="proposedOfferValidUntil"
                type="datetime-local"
                defaultValue={prefill.offerValidUntilLocal}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proposedSupplyValidUntil">Supply valid until (IST)</Label>
              <Input
                id="proposedSupplyValidUntil"
                name="proposedSupplyValidUntil"
                type="datetime-local"
                defaultValue={prefill.supplyValidUntilLocal}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Why these changes? (shown to the buyer)</Label>
            <textarea
              id="note"
              name="note"
              rows={3}
              className="flex w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              placeholder="e.g. We can supply 4 MT instead of 5 MT at this rate, in 200 kg drums."
            />
          </div>

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state?.success ? (
            <Alert variant="success">
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton>Send proposal to buyer</SubmitButton>
        </form>
      )}
    </div>
  );
}

function WithdrawProposalButton({ proposalId }: { proposalId: string }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await withdrawCounterProposalAction(proposalId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Withdraw proposal
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
