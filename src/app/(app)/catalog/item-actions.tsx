'use client';

import Link from 'next/link';
import { delistCatalogItemAction } from './actions';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-dialog';

export function CatalogItemActions({ itemId }: { itemId: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/catalog/${itemId}/edit`}>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </Link>
      <ConfirmButton
        variant="ghost"
        size="sm"
        title="Delist this product?"
        description="It will be hidden from buyer matching. You can re-add it later."
        confirmLabel="Delist"
        destructive
        onConfirm={async () => {
          const res = await delistCatalogItemAction(itemId);
          if (res?.error) throw new Error(res.error);
        }}
      >
        Delist
      </ConfirmButton>
    </div>
  );
}
