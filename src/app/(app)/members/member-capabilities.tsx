'use client';

import { useState, useTransition } from 'react';
import { setCapabilitiesAction } from './actions';
import { Checkbox } from '@/components/ui/checkbox';

export function MemberCapabilities({
  memberId,
  canBuy,
  canSell,
}: {
  memberId: string;
  canBuy: boolean;
  canSell: boolean;
}) {
  const [buy, setBuy] = useState(canBuy);
  const [sell, setSell] = useState(canSell);
  const [pending, start] = useTransition();

  function update(nextBuy: boolean, nextSell: boolean) {
    setBuy(nextBuy);
    setSell(nextSell);
    start(() => {
      void setCapabilitiesAction(memberId, nextBuy, nextSell);
    });
  }

  return (
    <div className="flex gap-4" aria-busy={pending}>
      <label className="flex items-center gap-1.5 text-sm">
        <Checkbox checked={buy} onChange={(e) => update(e.target.checked, sell)} /> Buy
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        <Checkbox checked={sell} onChange={(e) => update(buy, e.target.checked)} /> Sell
      </label>
    </div>
  );
}
