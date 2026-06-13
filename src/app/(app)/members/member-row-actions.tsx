'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteMemberAction,
  reEnableMemberAction,
  resendInviteAction,
  type MemberFormState,
} from './actions';
import { ConfirmButton } from '@/components/ui/confirm-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Status = 'invited' | 'active' | 'disabled';

/** Run a {error}-returning action; throw on error so ConfirmButton shows it in-modal. */
async function runOrThrow(fn: () => Promise<MemberFormState>): Promise<void> {
  const res = await fn();
  if (res?.error) throw new Error(res.error);
}

/**
 * Per-row member actions. Lifecycle-aware:
 *  - invited  → Edit · Resend invite · Delete (never-accepted invites are always safe)
 *  - active   → Disable (link to the reassignment flow)
 *  - disabled → Re-enable · Delete (only if referenced nowhere — server-enforced)
 * Self-row shows nothing destructive. Re-enable/Delete confirm in a modal; the
 * server action's {error} is surfaced by throwing inside onConfirm.
 */
export function MemberRowActions({
  memberId,
  memberName,
  status,
  isSelf,
}: {
  memberId: string;
  memberName: string;
  status: Status;
  isSelf: boolean;
}) {
  if (isSelf) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status === 'invited' ? (
        <>
          <Link
            href={`/members/${memberId}/edit`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Edit
          </Link>
          <ResendInviteButton memberId={memberId} />
        </>
      ) : null}

      {status === 'active' ? (
        <Link
          href={`/members/${memberId}/disable`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-destructive')}
        >
          Disable
        </Link>
      ) : null}

      {status === 'disabled' ? (
        <ConfirmButton
          variant="ghost"
          size="sm"
          title="Re-enable member"
          description={`Restore ${memberName}'s access. They will be able to sign in again.`}
          confirmLabel="Re-enable"
          onConfirm={() => runOrThrow(() => reEnableMemberAction(memberId))}
        >
          Re-enable
        </ConfirmButton>
      ) : null}

      {/* Delete: offered for invited (never-accepted) and disabled members. The
          server refuses if the member is referenced anywhere (FK + audit safety). */}
      {status !== 'active' ? (
        <ConfirmButton
          variant="ghost"
          size="sm"
          destructive
          className="text-destructive"
          title="Delete member"
          description={
            <>
              Permanently delete <strong>{memberName}</strong> and their sign-in. This only works if
              they have no catalog items, auctions, or bids — otherwise disable them instead. This
              cannot be undone.
            </>
          }
          confirmLabel="Delete"
          onConfirm={() => runOrThrow(() => deleteMemberAction(memberId))}
        >
          Delete
        </ConfirmButton>
      ) : null}
    </div>
  );
}

/** Resend has no dangerous side-effect, so it fires inline (with feedback) rather than via a modal. */
function ResendInviteButton({ memberId }: { memberId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await resendInviteAction(memberId);
            setMsg(
              res?.error
                ? { kind: 'err', text: res.error }
                : { kind: 'ok', text: 'Sent' },
            );
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Resend invite
      </Button>
      {msg ? (
        <span className={cn('text-xs', msg.kind === 'ok' ? 'text-success' : 'text-destructive')}>
          {msg.text}
        </span>
      ) : null}
    </span>
  );
}
