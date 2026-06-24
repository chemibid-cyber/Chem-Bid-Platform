'use client';

import { useEffect, useState } from 'react';
import { LogoMark } from './logo';

const SELLERS = 6;
const INITIAL_SECS = 18 * 3600 + 42 * 60 + 11;
const COMPETITORS = ['Seller A', 'Seller B', 'Seller C', 'Seller D', 'Seller E'];

function fmt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

/**
 * The landing's signature: a blind reverse auction playing out live. SSR renders
 * a static board (always visible, no JS needed); on the client — and only when
 * motion is allowed — the countdown ticks, competitor bids flash in, and the
 * blind rank climbs. Uses no Date.now()/random in the initial render, so server
 * and client hydrate identically.
 */
export function LiveBoard() {
  const [rank, setRank] = useState(3);
  const [secs, setSecs] = useState(INITIAL_SECS);
  const [flash, setFlash] = useState(-1);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const countdown = setInterval(() => setSecs((s) => (s > 1 ? s - 1 : INITIAL_SECS)), 1000);
    let i = 0;
    const sim = setInterval(() => {
      i += 1;
      const idx = Math.floor(Math.random() * COMPETITORS.length);
      setFlash(idx);
      window.setTimeout(() => setFlash((f) => (f === idx ? -1 : f)), 900);
      if (i % 2 === 0) setRank(2 + Math.floor(Math.random() * 3));
    }, 2600);
    return () => {
      clearInterval(countdown);
      clearInterval(sim);
    };
  }, []);

  return (
    <div className="rounded-2xl bg-graphite p-7 text-white shadow-card-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="livedot inline-block h-2 w-2 rounded-full bg-live" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Live · your blind rank
          </span>
        </div>
        <span className="text-xs tabular-nums text-white/45">closes in {fmt(secs)}</span>
      </div>

      <div className="mt-4 flex items-baseline gap-2 overflow-hidden">
        <span
          key={rank}
          className="animate-rankpop inline-block font-display text-[72px] font-extrabold leading-none tabular-nums"
        >
          #{rank}
        </span>
        <span className="text-xl font-medium text-white/55">/ {SELLERS} sellers</span>
      </div>

      <div className="my-5 h-px bg-white/10" />

      <div className="space-y-1.5">
        {COMPETITORS.map((label, idx) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-white/55 ${
              flash === idx ? 'animate-bidflash' : 'bg-white/[0.05]'
            }`}
          >
            <span className="font-display font-bold tabular-nums text-white/40">#{idx + 1}</span>
            <span>{label}</span>
            <span className="ml-auto tabular-nums tracking-widest text-white/35">••••••</span>
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-lg bg-live/15 px-3 py-2 text-[13px] text-white">
          <span className="font-display font-bold tabular-nums">#{rank}</span>
          <span className="font-medium">You</span>
          <span className="ml-auto tabular-nums">₹1,14,000 / MT</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-live/15 text-live">
          <LogoMark className="h-4 w-4" />
        </span>
        <div className="text-[13px]">
          <div className="font-medium text-white">Toluene · 99% min</div>
          <div className="tabular-nums text-white/50">10 MT · Ex-Works Bharuch</div>
        </div>
      </div>
    </div>
  );
}
