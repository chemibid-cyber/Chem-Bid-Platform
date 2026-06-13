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

/** Interpret a datetime-local string ("YYYY-MM-DDTHH:mm") as IST → UTC Date. */
export function istLocalToDate(local: string): Date {
  if (!local) return new Date(NaN);
  const withSeconds = local.length === 16 ? `${local}:00` : local;
  return new Date(`${withSeconds}+05:30`);
}

/** Render a Date as an IST datetime-local value ("YYYY-MM-DDTHH:mm") for form prefills. */
export function dateToIstLocal(date: Date | string | number | null | undefined): string {
  if (date == null) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  // en-CA gives ISO-ish "YYYY-MM-DD, HH:mm" parts; assemble the datetime-local string in IST.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour'); // guard the en-CA midnight quirk
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export const UNIT_LABEL: Record<string, string> = { kg: 'kg', mt: 'MT', l: 'L' };

export const PAYMENT_TERMS_LABEL: Record<string, string> = {
  advance: 'Advance payment',
  immediate: 'Immediate payment',
  net7: 'Net 7 days',
  net15: 'Net 15 days',
  net30: 'Net 30 days',
  net45: 'Net 45 days',
  net60: 'Net 60 days',
  net90: 'Net 90 days',
  net120: 'Net 120 days',
  lc: 'Letter of Credit',
  other: 'Other (custom)',
};

/** Ordered options for payment-terms dropdowns (auction + bid). */
export const PAYMENT_TERMS_OPTIONS: { value: string; label: string }[] = [
  'advance',
  'immediate',
  'net7',
  'net15',
  'net30',
  'net45',
  'net60',
  'net90',
  'net120',
  'lc',
  'other',
].map((value) => ({ value, label: PAYMENT_TERMS_LABEL[value] ?? value }));

/** Freight handling (#24) — buyer-stated, shown to sellers. */
export const FREIGHT_TERMS_LABEL: Record<string, string> = {
  included: 'Freight included',
  excluded: 'Freight excluded',
  extra: 'Freight extra',
  buyer_pickup: 'Buyer pickup',
  seller_arranged: 'Seller arranged transport',
};

export const FREIGHT_TERMS_OPTIONS: { value: string; label: string }[] = [
  'included',
  'excluded',
  'extra',
  'buyer_pickup',
  'seller_arranged',
].map((value) => ({ value, label: FREIGHT_TERMS_LABEL[value] ?? value }));

export const LOGISTICS_BASIS_LABEL: Record<string, string> = {
  delivered: 'Delivered (seller quotes freight)',
  exworks: 'Ex-Works (buyer arranges pickup)',
  other: 'Other (custom terms)',
};

export const GRADE_LABEL: Record<string, string> = {
  pure: 'Pure',
  distilled: 'Distilled',
  trade: 'Trade',
};
