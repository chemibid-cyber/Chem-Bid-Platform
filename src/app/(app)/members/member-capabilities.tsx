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
    <div className="flex flex-wrap gap-x-4 gap-y-2" aria-busy={pending}>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm leading-none">
        <Checkbox checked={buy} disabled={pending} onChange={(e) => update(e.target.checked, sell)} />
        <span>Buy</span>
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm leading-none">
        <Checkbox checked={sell} disabled={pending} onChange={(e) => update(buy, e.target.checked)} />
        <span>Sell</span>
      </label>
    </div>
  );
}
