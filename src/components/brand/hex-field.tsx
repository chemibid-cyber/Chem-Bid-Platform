import { cn } from '@/lib/utils';

/** A faint, slowly-drifting molecular motif (fused hexagon rings + bond nodes)
 *  for the hero backdrop — ChemiBid's organic-texture answer to a noise field.
 *  Purely decorative. */
export function HexField({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <svg
        className="animate-hexdrift absolute -right-24 -top-16 h-[520px] w-[520px] text-foreground/[0.05]"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
      >
        {/* fused rings (naphthalene-like) */}
        <polygon points="80,46 109.4,63 109.4,97 80,114 50.6,97 50.6,63" strokeWidth="1.5" />
        <polygon points="138.8,46 168.2,63 168.2,97 138.8,114 109.4,97 109.4,63" strokeWidth="1.5" />
        {/* bonds reaching out */}
        <line x1="168.2" y1="63" x2="188" y2="50" strokeWidth="1.5" />
        <line x1="80" y1="46" x2="80" y2="22" strokeWidth="1.5" />
        <line x1="50.6" y1="97" x2="31" y2="110" strokeWidth="1.5" />
        {/* nodes */}
        <g fill="currentColor" stroke="none">
          <circle cx="80" cy="46" r="3.5" />
          <circle cx="168.2" cy="63" r="3.5" />
          <circle cx="109.4" cy="97" r="3.5" />
          <circle cx="188" cy="50" r="3.5" />
          <circle cx="80" cy="22" r="3.5" />
          <circle cx="31" cy="110" r="3.5" />
          <circle cx="138.8" cy="114" r="3.5" />
        </g>
      </svg>
    </div>
  );
}
