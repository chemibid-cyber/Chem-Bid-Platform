'use client';

import { useTransition } from 'react';
import { ShoppingCart, Tag } from 'lucide-react';
import { setModeAction } from '@/app/(app)/mode-actions';
import type { Mode } from '@/lib/auth/mode';
import { cn } from '@/lib/utils';

export function ModeToggle({ mode }: { mode: Mode }) {
  const [pending, startTransition] = useTransition();

  function select(next: Mode) {
    if (next === mode || pending) return;
    startTransition(() => setModeAction(next));
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border bg-muted/40 p-0.5 text-sm',
        pending && 'opacity-70',
      )}
      role="group"
      aria-label="Buy or Sell mode"
    >
      <button
        type="button"
        onClick={() => select('buy')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
          mode === 'buy' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <ShoppingCart className="h-4 w-4" />
        Buy
      </button>
      <button
        type="button"
        onClick={() => select('sell')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
          mode === 'sell' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Tag className="h-4 w-4" />
        Sell
      </button>
    </div>
  );
}
