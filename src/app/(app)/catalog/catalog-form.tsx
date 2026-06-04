'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Search, ArrowRightLeft } from 'lucide-react';
import {
  createCatalogItemAction,
  resolveCasAction,
  requestTransferAction,
  type CatalogFormState,
} from './actions';
import type { CasResolution, CasCandidate } from '@/lib/cas/parse';
import { GRADES, ROLES } from '@/lib/catalog/constants';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function CollisionCard({ collision }: { collision: NonNullable<CatalogFormState>['collision'] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<CatalogFormState>(null);
  if (!collision) return null;

  return (
    <Alert variant="warning">
      <AlertTitle>Already managed by a colleague</AlertTitle>
      <AlertDescription>
        <p>
          This product is already managed by <strong>{collision.ownerName}</strong> (
          {collision.designation}, {collision.team}) — {collision.email}.
        </p>
        {result?.success ? (
          <p className="mt-2 font-medium text-success">{result.success}</p>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={pending}
            onClick={() => start(async () => setResult(await requestTransferAction(collision.itemId)))}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Request transfer
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function CatalogForm({ profileLabel }: { profileLabel: string }) {
  const [state, action] = useFormState(createCatalogItemAction, null);
  const [isMixture, setIsMixture] = useState(false);
  const [cas, setCas] = useState('');
  const [resolution, setResolution] = useState<CasResolution | null>(null);
  const [name, setName] = useState('');
  const [nameVerified, setNameVerified] = useState(false);
  const [resolving, startResolve] = useTransition();

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
        setName('');
        setNameVerified(false);
      } else {
        setName('');
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
    <form action={action} className="space-y-5">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.collision ? <CollisionCard collision={state.collision} /> : null}

      <p className="text-sm text-muted-foreground">
        Adding to your <strong>{profileLabel}</strong> catalog.
      </p>

      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
        <Checkbox
          id="isMixture"
          name="isMixture"
          checked={isMixture}
          onChange={(e) => setIsMixture(e.target.checked)}
        />
        <Label htmlFor="isMixture" className="font-normal">
          Custom mixture / blend (N/A — no single CAS)
        </Label>
      </div>

      {!isMixture ? (
        <div className="space-y-2">
          <Label htmlFor="casNumber">CAS number</Label>
          <div className="flex gap-2">
            <Input
              id="casNumber"
              name="casNumber"
              placeholder="108-88-3"
              value={cas}
              onChange={(e) => setCas(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={doResolve} disabled={resolving}>
              {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Resolve
            </Button>
          </div>

          {resolution?.status === 'found' ? (
            <p className="text-sm text-success">Matched on PubChem and locked.</p>
          ) : null}
          {resolution?.status === 'not_found' ? (
            <p className="text-sm text-warning-foreground">
              Couldn&apos;t find that CAS — enter the name manually (it&apos;ll be flagged unverified).
            </p>
          ) : null}
          {resolution?.status === 'ambiguous' ? (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Multiple matches — pick one:</p>
              <div className="space-y-1">
                {resolution.candidates.map((c) => (
                  <label key={c.cid} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="cidPick"
                      onChange={() => pick(c)}
                      className="accent-primary"
                    />
                    {c.name} <span className="text-muted-foreground">(CID {c.cid})</span>
                  </label>
                ))}
              </div>
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
          placeholder={isMixture ? '80% Ethanol / 20% Water' : 'Resolve a CAS or type a name'}
        />
        <input type="hidden" name="nameVerified" value={String(nameVerified)} />
      </div>

      {isMixture ? (
        <div className="space-y-2">
          <Label htmlFor="mixtureText">Composition / notes</Label>
          <Textarea id="mixtureText" name="mixtureText" placeholder="e.g. 80% Ethanol, 20% DM Water" />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Your role for this product</Label>
        <div className="flex flex-wrap gap-4">
          {ROLES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <Checkbox name="roles" value={r.value} /> {r.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grade">Quality grade</Label>
          <Select id="grade" name="grade" defaultValue="trade">
            {GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minPurity">Minimum purity (%)</Label>
          <Input id="minPurity" name="minPurity" type="number" step="0.01" min="0" max="100" placeholder="99.5" />
        </div>
      </div>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {GRADES.map((g) => (
          <li key={g.value}>
            <strong>{g.label}:</strong> {g.desc}
          </li>
        ))}
      </ul>

      <SubmitButton>Add to catalog</SubmitButton>
    </form>
  );
}
