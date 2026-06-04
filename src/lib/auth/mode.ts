import { cookies } from 'next/headers';

export type Mode = 'buy' | 'sell';

export interface Capable {
  canBuy: boolean;
  canSell: boolean;
  isAdmin: boolean;
}

/** Pure: resolve the effective mode from capabilities + a cookie preference. */
export function resolveMode(user: Capable, cookieVal?: string): Mode {
  const canBuy = user.canBuy || user.isAdmin;
  const canSell = user.canSell || user.isAdmin;
  if (cookieVal === 'sell' && canSell) return 'sell';
  if (cookieVal === 'buy' && canBuy) return 'buy';
  return canBuy ? 'buy' : 'sell';
}

export function canToggleMode(user: Capable): boolean {
  const canBuy = user.canBuy || user.isAdmin;
  const canSell = user.canSell || user.isAdmin;
  return canBuy && canSell;
}

export function getActiveMode(user: Capable): Mode {
  const cookieVal = cookies().get('mode')?.value;
  return resolveMode(user, cookieVal);
}
