'use client';

import { useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getBidCoaUrlAction } from '../../actions';
import { Button } from '@/components/ui/button';

export function CoaDownload({ bidId }: { bidId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await getBidCoaUrlAction(bidId);
          if (res.url) window.open(res.url, '_blank');
          else alert(res.error ?? 'Could not open COA.');
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      COA
    </Button>
  );
}
