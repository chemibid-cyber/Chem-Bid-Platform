'use client';

import { ConfirmButton } from '@/components/ui/confirm-dialog';
import { unblockAction } from './actions';

export function UnblockButton({ blockId, companyName }: { blockId: string; companyName: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      title="Remove this block?"
      description={
        <>
          <span className="font-medium">{companyName}</span> will become eligible for your future
          requirements again. You can re-block them anytime.
        </>
      }
      confirmLabel="Unblock"
      onConfirm={async () => {
        const res = await unblockAction(blockId);
        if (res?.error) throw new Error(res.error);
      }}
    >
      Unblock
    </ConfirmButton>
  );
}
