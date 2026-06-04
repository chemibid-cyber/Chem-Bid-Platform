'use client';

import { useFormState } from 'react-dom';
import { confirmDisableAction, type MemberFormState } from '../../actions';
import { SubmitButton } from '@/components/submit-button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface TargetOption {
  id: string;
  name: string;
}

export function DisableForm({
  memberId,
  needsReassign,
  targets,
}: {
  memberId: string;
  needsReassign: boolean;
  targets: TargetOption[];
}) {
  const [state, action] = useFormState<MemberFormState, FormData>(confirmDisableAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <input type="hidden" name="memberId" value={memberId} />

      {needsReassign ? (
        targets.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="targetId">Reassign their items to</Label>
            <Select id="targetId" name="targetId" required defaultValue="">
              <option value="" disabled>
                Select a colleague…
              </option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <Alert variant="warning">
            <AlertDescription>
              No eligible colleague to reassign to. Add or enable another member with Buy + Sell
              capability first.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      <SubmitButton variant="destructive" disabled={needsReassign && targets.length === 0}>
        Disable member
      </SubmitButton>
    </form>
  );
}
