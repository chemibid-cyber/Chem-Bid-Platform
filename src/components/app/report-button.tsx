'use client';

import { useState, useTransition } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { reportActorAction } from '@/app/(app)/report-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ReportButton({
  companyId,
  label = 'Report',
}: {
  companyId: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<string | null>(null);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive">
        <Flag className="h-3.5 w-3.5" /> {label}
      </summary>
      <div className="mt-2 w-72 space-y-2 rounded-md border bg-popover p-3 shadow-sm">
        {done ? (
          <p className="text-xs text-success">{done}</p>
        ) : (
          <>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What's the concern? (e.g. fake auction, price-fishing)"
              className="min-h-[60px] text-sm"
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={pending || reason.trim().length < 5}
              onClick={() =>
                start(async () => {
                  const res = await reportActorAction(companyId, reason);
                  setDone(res?.success ?? res?.error ?? null);
                })
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit report
            </Button>
          </>
        )}
      </div>
    </details>
  );
}
