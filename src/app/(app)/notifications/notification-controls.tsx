'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { markAllReadAction, markReadAction } from './actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending || disabled} onClick={() => start(() => markAllReadAction())}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      Mark all read
    </Button>
  );
}

export function NotificationItem({
  id,
  href,
  title,
  time,
  unread,
}: {
  id: string;
  href: string | null;
  title: string;
  time: string;
  unread: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function open() {
    start(async () => {
      if (unread) await markReadAction(id);
      if (href) router.push(href);
    });
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/40',
        unread ? 'border-brand/20 bg-brand/5' : 'border-transparent bg-card shadow-card',
      )}
    >
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-brand' : 'bg-transparent')} />
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs tabular-nums text-muted-foreground">{time}</span>
      </span>
      {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </button>
  );
}
