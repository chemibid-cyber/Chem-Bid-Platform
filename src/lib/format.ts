/** Display formatting helpers. All timestamps render in IST (Asia/Kolkata). */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatINR(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return INR.format(n);
}

/** Plain rate like "112.50" (no symbol) for "/unit" contexts. */
export function formatRate(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const IST_DATETIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function formatIST(date: Date | string | number | null | undefined): string {
  if (date == null) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return `${IST_DATETIME.format(d)} IST`;
}

/** Compact human countdown, e.g. "2d 4h", "3h 12m", "Closed". */
export function timeRemaining(closesAt: Date | string | number, now: Date = new Date()): string {
  const end = closesAt instanceof Date ? closesAt : new Date(closesAt);
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 'Closed';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const UNIT_LABEL: Record<string, string> = { kg: 'kg', mt: 'MT', l: 'L' };

export const PAYMENT_TERMS_LABEL: Record<string, string> = {
  advance: 'Advance',
  net15: 'Net 15',
  net30: 'Net 30',
  net45: 'Net 45',
  lc: 'Letter of Credit',
};

export const GRADE_LABEL: Record<string, string> = {
  pure: 'Pure',
  distilled: 'Distilled',
  trade: 'Trade',
};
