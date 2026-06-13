import { AlertTriangle } from 'lucide-react';
import { BackButton } from './back-button';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <BackButton />
      <div className="mt-6 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          <strong>DRAFT — pending legal review.</strong> This is placeholder copy. An Indian
          commercial lawyer must review and finalise this before launch (CLAUDE.md §11.1).
        </p>
      </div>
      <article className="prose prose-slate mt-8 max-w-none text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mt-3">
        {children}
      </article>
    </div>
  );
}
