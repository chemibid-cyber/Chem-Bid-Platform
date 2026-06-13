'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Search } from 'lucide-react';
import { createAuctionAction, type AuctionFormState } from './actions';
import { resolveCasAction } from '../catalog/actions';
import type { CasResolution, CasCandidate } from '@/lib/cas/parse';
import { ROLES } from '@/lib/catalog/constants';
import {
  PAYMENT_TERMS_OPTIONS,
  FREIGHT_TERMS_OPTIONS,
  LOGISTICS_BASIS_LABEL,
} from '@/lib/format';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
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
  deliveryTermsCustom: string | null;
  paymentTerms: string | null;
  paymentTermsCustom: string | null;
  freightTerms: string | null;
  supplierFilter: string[];
  remarks: string | null;
  privacyMode: string;
  blind: boolean;
}

/** A row from the buyer's PURCHASE catalog, used to populate the product picker. */
export interface CatalogPick {
  id: string;
  casNumber: string | null;
  name: string;
  isMixture: boolean;
  mixtureText: string | null;
}

const OTHER_OPTION = '__other__';

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AuctionForm({
  defaultAddress,
  initial,
  catalog,
}: {
  defaultAddress: string;
  initial?: AuctionInitial;
  catalog: CatalogPick[];
}) {
  const [state, action] = useFormState<AuctionFormState, FormData>(createAuctionAction, null);
  const [isMixture, setIsMixture] = useState(initial?.isMixture ?? false);
  const [cas, setCas] = useState(initial?.casNumber ?? '');
  const [resolution, setResolution] = useState<CasResolution | null>(null);
  const [name, setName] = useState(initial?.name ?? '');
  const [mixtureText, setMixtureText] = useState(initial?.mixtureText ?? '');
  const [nameVerified, setNameVerified] = useState(false);
  const [resolving, startResolve] = useTransition();

  // #14 / #18 — reveal a free-text input when the buyer picks the "other" option.
  const [logisticsBasis, setLogisticsBasis] = useState(initial?.logisticsBasis ?? 'delivered');
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? '');

  // Product picker: a catalog item id, OTHER_OPTION (manual entry), or '' (none yet).
  // Pre-filled clones (which carry no catalog id) start on the manual path.
  const hasCatalog = catalog.length > 0;
  const [picked, setPicked] = useState<string>(
    hasCatalog && !initial ? '' : OTHER_OPTION,
  );
  const isManual = picked === OTHER_OPTION;
  const selectedItem = catalog.find((c) => c.id === picked) ?? null;

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

  function selectProduct(value: string) {
    setPicked(value);
    setResolution(null);
    if (value === OTHER_OPTION || value === '') {
      // Hand control back to the manual CAS / mixture flow.
      setCas('');
      setName('');
      setMixtureText('');
      setIsMixture(false);
      setNameVerified(false);
      return;
    }
    const item = catalog.find((c) => c.id === value);
    if (!item) return;
    setIsMixture(item.isMixture);
    setCas(item.casNumber ?? '');
    setName(item.name);
    setMixtureText(item.mixtureText ?? '');
    setNameVerified(!item.isMixture);
  }

  // Name auto-fills and locks when a catalog item is chosen, or when a manual CAS
  // resolved to a single/disambiguated match. It stays editable only for genuine
  // free-text mixtures (manual path) or when a manual CAS came back not_found.
  const catalogLocked = selectedItem !== null;
  const nameLocked =
    catalogLocked || (!isMixture && nameVerified && resolution?.status !== 'not_found');

  return (
    <form
      action={action}
      className="space-y-6"
      onKeyDown={(e) => {
        // Prevent Enter inside a text input from submitting the half-filled form.
        // Textareas keep Enter (newlines); the submit/buttons keep their click/Enter.
        if (e.key !== 'Enter') return;
        const target = e.target as HTMLElement;
        if (target instanceof HTMLInputElement && target.type !== 'submit' && target.type !== 'button') {
          e.preventDefault();
        }
      }}
    >
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {hasCatalog ? (
        <div className="space-y-2">
          <Label htmlFor="catalogPick">Product from your catalog</Label>
          <Select
            id="catalogPick"
            value={picked}
            onChange={(e) => selectProduct(e.target.value)}
          >
            <option value="" disabled>
              Select a chemical…
            </option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.casNumber ? ` — CAS ${c.casNumber}` : ''}
              </option>
            ))}
            <option value={OTHER_OPTION}>— Other (not in my catalog) —</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pick from your procurement list, or choose “Other” to enter a chemical manually.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add chemicals to your Catalog to pick them here.
        </p>
      )}

      {/* Manual entry path: mixture toggle + CAS resolve. */}
      {isManual ? (
        <>
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
                      e.stopPropagation();
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
        </>
      ) : (
        // Catalog path: the item fixes the CAS + mixture flag — submit them as hidden
        // fields so createAuctionAction reads the same names (casNumber / isMixture).
        <>
          {selectedItem && !selectedItem.isMixture ? (
            <div className="space-y-2">
              <Label htmlFor="casNumberDisplay">CAS number</Label>
              <Input
                id="casNumberDisplay"
                name="casNumber"
                value={cas}
                readOnly
                className="bg-muted font-semibold"
              />
            </div>
          ) : null}
          {selectedItem?.isMixture ? <input type="hidden" name="isMixture" value="on" /> : null}
        </>
      )}

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
          <Textarea
            id="mixtureText"
            name="mixtureText"
            value={mixtureText}
            onChange={(e) => setMixtureText(e.target.value)}
            readOnly={catalogLocked}
            className={catalogLocked ? 'bg-muted' : ''}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <DecimalInput id="quantity" name="quantity" maxDecimals={2} min="0" defaultValue={initial?.quantity ?? ''} required />
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
          <DecimalInput id="minPurity" name="minPurity" maxDecimals={2} min="0" max="100" defaultValue={initial?.minPurity ?? ''} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="packing">Packing</Label>
          <Input id="packing" name="packing" placeholder="e.g. 200L HDPE drums" defaultValue={initial?.packing ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="logisticsBasis">Logistics basis</Label>
          <Select
            id="logisticsBasis"
            name="logisticsBasis"
            value={logisticsBasis}
            onChange={(e) => setLogisticsBasis(e.target.value)}
          >
            <option value="delivered">{LOGISTICS_BASIS_LABEL.delivered}</option>
            <option value="exworks">Ex-Works (you arrange pickup — no freight)</option>
            <option value="other">{LOGISTICS_BASIS_LABEL.other}</option>
          </Select>
        </div>
      </div>

      {/* #14 — custom delivery terms when logistics basis is "Other". */}
      {logisticsBasis === 'other' ? (
        <div className="space-y-2">
          <Label htmlFor="deliveryTermsCustom">Custom delivery terms</Label>
          <Textarea
            id="deliveryTermsCustom"
            name="deliveryTermsCustom"
            placeholder="Describe the delivery arrangement (e.g. FOR destination, partial CIF…)."
            defaultValue={initial?.deliveryTermsCustom ?? ''}
            required
          />
        </div>
      ) : null}

      {/* #18 — payment terms for this requirement (required); #24 — freight handling. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Select
            id="paymentTerms"
            name="paymentTerms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            required
          >
            <option value="" disabled>
              Select payment terms…
            </option>
            {PAYMENT_TERMS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="freightTerms">Freight handling</Label>
          <Select id="freightTerms" name="freightTerms" defaultValue={initial?.freightTerms ?? ''}>
            <option value="">Not specified</option>
            {FREIGHT_TERMS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Informational — shown to sellers.</p>
        </div>
      </div>

      {paymentTerms === 'other' ? (
        <div className="space-y-2">
          <Label htmlFor="paymentTermsCustom">Custom payment terms</Label>
          <Input
            id="paymentTermsCustom"
            name="paymentTermsCustom"
            placeholder="e.g. 30% advance, balance against documents"
            defaultValue={initial?.paymentTermsCustom ?? ''}
            required
          />
        </div>
      ) : null}

      {/* #22 — optional offer / supply validity windows (IST). */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="offerValidUntil">Offer valid until (optional)</Label>
          <Input id="offerValidUntil" name="offerValidUntil" type="datetime-local" min={minLocal} />
          <p className="text-xs text-muted-foreground">How long your requirement stays open to quotes.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplyValidUntil">Supply valid until (optional)</Label>
          <Input id="supplyValidUntil" name="supplyValidUntil" type="datetime-local" min={minLocal} />
          <p className="text-xs text-muted-foreground">By when you need the material supplied.</p>
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
        <FileDropzone
          id="specFile"
          name="specFile"
          accept="application/pdf,image/jpeg,image/png"
          hint="PDF, JPG or PNG, up to 10 MB. Only accepted sellers can download it."
        />
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
