import { describe, it, expect } from 'vitest';
import { resolveMode, canToggleMode } from './mode';

const both = { canBuy: true, canSell: true, isAdmin: false };
const buyerOnly = { canBuy: true, canSell: false, isAdmin: false };
const sellerOnly = { canBuy: false, canSell: true, isAdmin: false };
const admin = { canBuy: false, canSell: false, isAdmin: true };

describe('mode resolution', () => {
  it('honours the cookie when the capability allows it', () => {
    expect(resolveMode(both, 'sell')).toBe('sell');
    expect(resolveMode(both, 'buy')).toBe('buy');
  });

  it('falls back to a permitted mode when the cookie is disallowed', () => {
    expect(resolveMode(buyerOnly, 'sell')).toBe('buy');
    expect(resolveMode(sellerOnly, 'buy')).toBe('sell');
  });

  it('defaults buyers to buy and sell-only to sell', () => {
    expect(resolveMode(buyerOnly, undefined)).toBe('buy');
    expect(resolveMode(sellerOnly, undefined)).toBe('sell');
  });

  it('treats admins as both-capable', () => {
    expect(canToggleMode(admin)).toBe(true);
    expect(resolveMode(admin, 'sell')).toBe('sell');
  });

  it('only lets dual-capability users toggle', () => {
    expect(canToggleMode(both)).toBe(true);
    expect(canToggleMode(buyerOnly)).toBe(false);
    expect(canToggleMode(sellerOnly)).toBe(false);
  });
});
