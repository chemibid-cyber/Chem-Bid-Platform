'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  /** Optional in-app link the whole toast navigates to when clicked. */
  href?: string | null;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'> & { id?: string }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Access the toast API from any client component below <Toaster/>. */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <Toaster/>');
  return ctx;
}

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 4;

/**
 * Hand-rolled toast system (no external lib). Renders a fixed top-right,
 * stacking, auto-dismissing region and exposes a `useToast()` API via context.
 */
export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback<ToastContextValue['toast']>(
    (t) => {
      const id = t.id ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now() + Math.random()));
      setToasts((prev) => {
        if (prev.some((existing) => existing.id === id)) return prev; // dedupe
        const next = [...prev, { id, title: t.title, description: t.description, href: t.href }];
        return next.slice(-MAX_VISIBLE); // keep only the most recent N
      });
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );

  const baseClass = cn(
    'pointer-events-auto flex items-start gap-3 rounded-lg border bg-background p-3 shadow-lg',
    'animate-in slide-in-from-right-4 fade-in duration-200',
  );

  if (toast.href) {
    return (
      <Link href={toast.href} role="status" className={cn(baseClass, 'hover:bg-muted/40')} onClick={onDismiss}>
        {body}
      </Link>
    );
  }

  return (
    <div role="status" className={baseClass}>
      {body}
    </div>
  );
}
