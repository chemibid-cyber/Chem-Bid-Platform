'use client';

import { useState, useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getBidCoaUrlAction } from '../../actions';
import { Button } from '@/components/ui/button';

export function CoaDownload({ bidId }: { bidId: string }) {
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
            const res = await getBidCoaUrlAction(bidId);
            if (res.url) window.open(res.url, '_blank');
            else setError(res.error ?? 'Could not open COA.');
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        COA
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
