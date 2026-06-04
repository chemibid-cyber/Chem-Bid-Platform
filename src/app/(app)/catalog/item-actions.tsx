'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { delistCatalogItemAction } from './actions';
import { Button } from '@/components/ui/button';

export function CatalogItemActions({ itemId }: { itemId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function delist() {
    if (!confirm('Delist this product? It will be hidden from matching.')) return;
    start(async () => {
      const res = await delistCatalogItemAction(itemId);
      setError(res?.error ?? null);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Link href={`/catalog/${itemId}/edit`}>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={delist} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Delist
      </Button>
    </div>
  );
}
