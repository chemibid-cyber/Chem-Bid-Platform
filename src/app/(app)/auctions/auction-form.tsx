'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Search } from 'lucide-react';
import { createAuctionAction, type AuctionFormState } from './actions';
import { resolveCasAction } from '../catalog/actions';
import type { CasResolution, CasCandidate } from '@/lib/cas/parse';
import { ROLES } from '@/lib/catalog/constants';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface AuctionInitial {
  casNumber: string | null;
  name: string;
  isMixture: boolean;
  mixtureText: string | null;
  quantity: string;
  unit: string;
  minPurity: string | null;
  packing: string | null;
  logisticsBasis: string;
  supplierFilter: string[];
  remarks: string | null;
  privacyMode: string;
  blind: boolean;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AuctionForm({
  defaultAddress,
  initial,
}: {
  defaultAddress: string;
  initial?: AuctionInitial;
}) {
  const [state, action] = useFormState<AuctionFormState, FormData>(createAuctionAction, null);
  const [isMixture, setIsMixture] = useState(initial?.isMixture ?? false);
  const [cas, setCas] = useState(initial?.casNumber ?? '');
  const [resolution, setResolution] = useState<CasResolution | null>(null);
  const [name, setName] = useState(initial?.name ?? '');
  const [nameVerified, setNameVerified] = useState(false);
  const [resolving, startResolve] = useTransition();

  const now = new Date();
  const minLocal = toLocalInput(new Date(now.getTime() + 6 * 3_600_000));
  const defaultLocal = toLocalInput(new Date(now.getTime() + 48 * 3_600_000));

  function doResolve() {
    const value = cas.trim();
    if (!value) return;
    startResolve(async () => {
      const r = await resolveCasAction(value);
      setResolution(r);
      if (r.status === 'found') {
        setName(r.name);
        setNameVerified(true);
      } else if (r.status === 'not_found') {
        setNameVerified(false);
      } else {
        setNameVerified(true);
      }
    });
  }

  function pick(c: CasCandidate) {
    setName(c.name);
    setNameVerified(true);
  }

  const nameLocked = !isMixture && nameVerified && resolution?.status !== 'not_found';

  return (
    <form action={action} className="space-y-6">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
        <Checkbox
          id="isMixture"
          name="isMixture"
          checked={isMixture}
          onChange={(e) => setIsMixture(e.target.checked)}
        />
        <Label htmlFor="isMixture" className="font-normal">
          Custom mixture / blend (no single CAS)
        </Label>
      </div>

      {!isMixture ? (
        <div className="space-y-2">
          <Label htmlFor="casNumber">CAS number</Label>
          <div className="flex gap-2">
            <Input
              id="casNumber"
              name="casNumber"
              value={cas}
              onChange={(e) => setCas(e.target.value)}
              onKeyDown={(e) => {
                // Enter resolves the CAS instead of submitting the half-filled form.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  doResolve();
                }
              }}
              placeholder="108-88-3"
            />
            <Button type="button" variant="outline" onClick={doResolve} disabled={resolving}>
              {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Resolve
            </Button>
          </div>
          {resolution?.status === 'not_found' ? (
            <p className="text-sm text-warning-foreground">Couldn&apos;t find that CAS — type the name manually.</p>
          ) : null}
          {resolution?.status === 'ambiguous' ? (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Multiple matches — pick one:</p>
              {resolution.candidates.map((c) => (
                <label key={c.cid} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="cidPick" onChange={() => pick(c)} className="accent-primary" />
                  {c.name} <span className="text-muted-foreground">(CID {c.cid})</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">{isMixture ? 'Mixture name' : 'Product name'}</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          readOnly={nameLocked}
          required
          className={nameLocked ? 'bg-muted font-semibold' : ''}
        />
      </div>

      {isMixture ? (
        <div className="space-y-2">
          <Label htmlFor="mixtureText">Composition / notes</Label>
          <Textarea id="mixtureText" name="mixtureText" defaultValue={initial?.mixtureText ?? ''} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" step="0.001" min="0" defaultValue={initial?.quantity ?? ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select id="unit" name="unit" defaultValue={initial?.unit ?? 'kg'}>
            <option value="kg">kg</option>
            <option value="mt">MT</option>
            <option value="l">L</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minPurity">Min purity (%)</Label>
          <Input id="minPurity" name="minPurity" type="number" step="0.01" min="0" max="100" defaultValue={initial?.minPurity ?? ''} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="packing">Packing</Label>
          <Input id="packing" name="packing" placeholder="e.g. 200L HDPE drums" defaultValue={initial?.packing ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="logisticsBasis">Logistics basis</Label>
          <Select id="logisticsBasis" name="logisticsBasis" defaultValue={initial?.logisticsBasis ?? 'delivered'}>
            <option value="delivered">Delivered (seller quotes freight)</option>
            <option value="exworks">Ex-Works (you arrange pickup — no freight)</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryAddress">Delivery address</Label>
        <Textarea id="deliveryAddress" name="deliveryAddress" defaultValue={defaultAddress} required />
        <p className="text-xs text-muted-foreground">Defaults to your registered address — edit if different.</p>
      </div>

      <div className="space-y-2">
        <Label>Supplier type filter</Label>
        <div className="flex flex-wrap gap-4">
          {ROLES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <Checkbox name="supplierFilter" value={r.value} defaultChecked={initial?.supplierFilter.includes(r.value)} />
              {r.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Leave all unchecked to allow any supplier type.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="specFile">Spec sheet (optional)</Label>
        <Input id="specFile" name="specFile" type="file" accept="application/pdf,image/jpeg,image/png" />
        <p className="text-xs text-muted-foreground">PDF, JPG or PNG, up to 10 MB. Only accepted sellers can download it.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" name="remarks" defaultValue={initial?.remarks ?? ''} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="closesAt">Closing date &amp; time (IST)</Label>
          <Input id="closesAt" name="closesAt" type="datetime-local" min={minLocal} defaultValue={defaultLocal} required />
          <p className="text-xs text-muted-foreground">Between 6 hours and 14 days from now.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="privacyMode">Visibility</Label>
          <Select id="privacyMode" name="privacyMode" defaultValue={initial?.privacyMode ?? 'all'}>
            <option value="all">Send to all qualified sellers</option>
            <option value="registered">Registered partners only</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
        <Checkbox id="blind" name="blind" defaultChecked={initial?.blind ?? true} />
        <Label htmlFor="blind" className="font-normal">
          Blind mode — sellers see only their own rank, never competitor prices or identities
        </Label>
      </div>

      <SubmitButton>Publish auction</SubmitButton>
    </form>
  );
}
