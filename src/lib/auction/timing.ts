/**
 * Auction timing rules (CLAUDE.md §2 / FR-3.1, DECISION 12).
 *  - Closing window: min 6h, max 14d from now (IST display).
 *  - One extension allowed, adding ≤ 48h.
 *  - Stage-2 is a strict 24h timer; final-2-hours triggers urgency.
 */
export const MIN_HOURS = 6;
export const MAX_DAYS = 14;
export const MAX_EXTENSION_HOURS = 48;
export const STAGE2_HOURS = 24;
export const FINAL_URGENCY_HOURS = 2;

export interface TimingCheck {
  ok: boolean;
  error?: string;
}

export function validateClosingTime(closesAt: Date, now: Date = new Date()): TimingCheck {
  if (Number.isNaN(closesAt.getTime())) return { ok: false, error: 'Enter a valid closing date and time.' };
  const ms = closesAt.getTime() - now.getTime();
  if (ms < MIN_HOURS * 3_600_000) {
    return { ok: false, error: `Closing time must be at least ${MIN_HOURS} hours from now.` };
  }
  if (ms > MAX_DAYS * 86_400_000) {
    return { ok: false, error: `Closing time can be at most ${MAX_DAYS} days from now.` };
  }
  return { ok: true };
}

/** A one-time extension that may add at most 48h and must move the deadline later. */
export function validateExtension(currentCloses: Date, newCloses: Date): TimingCheck {
  if (Number.isNaN(newCloses.getTime())) return { ok: false, error: 'Enter a valid new closing time.' };
  if (newCloses.getTime() <= currentCloses.getTime()) {
    return { ok: false, error: 'The new closing time must be later than the current one.' };
  }
  if (newCloses.getTime() - currentCloses.getTime() > MAX_EXTENSION_HOURS * 3_600_000) {
    return { ok: false, error: `An extension can add at most ${MAX_EXTENSION_HOURS} hours.` };
  }
  return { ok: true };
}

export function stage2CloseTime(from: Date = new Date()): Date {
  return new Date(from.getTime() + STAGE2_HOURS * 3_600_000);
}

/** True within the final urgency window (ranks hidden, urgent push/email). */
export function isFinalUrgency(closesAt: Date, now: Date = new Date()): boolean {
  const ms = closesAt.getTime() - now.getTime();
  return ms > 0 && ms <= FINAL_URGENCY_HOURS * 3_600_000;
}
