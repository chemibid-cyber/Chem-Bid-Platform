'use client';

import { useFormState } from 'react-dom';
import { updateCatalogItemAction, type CatalogFormState } from '../../actions';
import { GRADES, ROLES } from '@/lib/catalog/constants';
import { SubmitButton } from '@/components/submit-button';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface EditItem {
  id: string;
  name: string;
  grade: string;
  minPurity: string | null;
  roles: string[];
  isMixture: boolean;
  mixtureText: string | null;
}

export function CatalogEditForm({ item }: { item: EditItem }) {
  const [state, action] = useFormState<CatalogFormState, FormData>(updateCatalogItemAction, null);

  return (
    <form action={action} className="space-y-5">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="id" value={item.id} />

      <div className="space-y-1">
        <Label>Product</Label>
        <p className="font-display text-lg font-semibold tracking-tight">{item.name}</p>
      </div>

      <div className="space-y-2">
        <Label>Roles</Label>
        <div className="flex flex-wrap gap-4">
          {ROLES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <Checkbox name="roles" value={r.value} defaultChecked={item.roles.includes(r.value)} />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grade">Quality grade</Label>
          <Select id="grade" name="grade" defaultValue={item.grade}>
            {GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minPurity">Minimum purity (%)</Label>
          <DecimalInput
            id="minPurity"
            name="minPurity"
            maxDecimals={2}
            min="0"
            max="100"
            defaultValue={item.minPurity ?? ''}
          />
        </div>
      </div>

      {item.isMixture ? (
        <div className="space-y-2">
          <Label htmlFor="mixtureText">Composition / notes</Label>
          <Textarea id="mixtureText" name="mixtureText" defaultValue={item.mixtureText ?? ''} />
        </div>
      ) : null}

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
