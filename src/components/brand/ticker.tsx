const ITEMS: [string, string, string, 'down' | 'up'][] = [
  ['Toluene', '108-88-3', '₹1,14,000', 'down'],
  ['Acetone', '67-64-1', '₹89,500', 'up'],
  ['Methanol', '67-56-1', '₹38,200', 'down'],
  ['Ethanol', '64-17-5', '₹71,400', 'up'],
  ['Xylene', '1330-20-7', '₹1,02,800', 'down'],
  ['Isopropyl alcohol', '67-63-0', '₹96,100', 'up'],
  ['Benzene', '71-43-2', '₹88,900', 'down'],
  ['MEK', '78-93-3', '₹1,21,500', 'up'],
];

function Row() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {ITEMS.map(([name, cas, rate, dir], i) => (
        <span key={i} className="flex items-center gap-2.5 whitespace-nowrap px-6 text-sm">
          <span className="font-medium text-foreground">{name}</span>
          <span className="tabular-nums text-muted-foreground">{cas}</span>
          <span className="tabular-nums text-foreground">{rate}/MT</span>
          <span className={dir === 'down' ? 'text-brand' : 'text-warning'}>
            {dir === 'down' ? '▾' : '▴'}
          </span>
          <span className="text-border">·</span>
        </span>
      ))}
    </div>
  );
}

/** A commodities-style ticker tape of chemicals + CAS + indicative rates. Pure
 *  CSS marquee; the row is duplicated so the -50% loop is seamless. */
export function Ticker() {
  return (
    <div className="overflow-hidden border-y border-border bg-card py-3">
      <div className="flex w-max animate-ticker">
        <Row />
        <Row />
      </div>
    </div>
  );
}
