'use client';

import { useEffect, useState } from 'react';

const INITIAL_SECS = 18 * 3600 + 42 * 60 + 11; // 18:42:11

function fmt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function SealedTile({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '9px 0',
        borderRadius: 7,
        background: '#2A2118',
        border: '1px solid rgba(244,238,231,0.1)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="6" y="11" width="12" height="8" rx="1.6" stroke="rgba(244,238,231,0.3)" strokeWidth="1.8" />
        <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="rgba(244,238,231,0.3)" strokeWidth="1.8" />
      </svg>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 11, color: 'rgba(244,238,231,0.3)' }}>
        {label}
      </span>
    </div>
  );
}

/**
 * The landing's signature: a blind reverse auction shown as a rank gauge. SSR
 * renders a fully-visible static board (no JS required); on the client, and only
 * when motion is allowed, the countdown ticks and the gauge arc wipes in once.
 * No Date.now()/random in the initial render, so server and client hydrate
 * identically. Rivals are SEALED by design — never a price, never a name.
 */
export function LiveBoard() {
  const [secs, setSecs] = useState(INITIAL_SECS);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSecs((s) => (s > 1 ? s - 1 : INITIAL_SECS)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        fontFamily: 'var(--body)',
        background: '#1F1812',
        border: '1px solid rgba(244,238,231,0.12)',
        borderRadius: 14,
        overflow: 'hidden',
        color: '#F4EEE7',
        position: 'relative',
        boxSizing: 'border-box',
        boxShadow: '0 24px 60px -28px rgba(0,0,0,0.7)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -90,
          right: -70,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(255,90,31,0.16),rgba(255,90,31,0) 68%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subject + live badge */}
      <div style={{ position: 'relative', padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              style={{
                flex: 'none',
                width: 30,
                height: 30,
                borderRadius: 7,
                background: '#2A2118',
                border: '1px solid rgba(244,238,231,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2.6 20.4 7.3v9.4L12 21.4 3.6 16.7V7.3z"
                  stroke="#FFB020"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.4" fill="#FFB020" />
              </svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--sg)',
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                Toluene
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontWeight: 500,
                  fontSize: 10,
                  color: 'rgba(244,238,231,0.52)',
                  marginTop: 2,
                }}
              >
                CAS 108-88-3
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 9px',
              borderRadius: 999,
              background: 'rgba(255,90,31,0.12)',
              border: '1px solid rgba(255,90,31,0.4)',
            }}
          >
            <span
              className="cb-livedot"
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5A1F', boxShadow: '0 0 6px #FF5A1F' }}
            />
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontWeight: 500,
                fontSize: 9,
                letterSpacing: '0.14em',
                color: '#FF5A1F',
              }}
            >
              LIVE · BLIND
            </span>
          </div>
        </div>

        {/* Spec pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {['99% MIN', '10 MT', 'EX-WORKS · BHARUCH'].map((p) => (
            <span
              key={p}
              style={{
                fontFamily: 'var(--mono)',
                fontWeight: 500,
                fontSize: 10,
                color: 'rgba(244,238,231,0.52)',
                background: '#2A2118',
                border: '1px solid rgba(244,238,231,0.12)',
                borderRadius: 6,
                padding: '4px 8px',
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Gauge + your bid */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px 14px' }}>
        <div style={{ flex: 'none', position: 'relative', width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
            <circle cx="64" cy="64" r="54" fill="none" stroke="#2A2118" strokeWidth="11" />
            <circle
              cx="64"
              cy="64"
              r="54"
              fill="none"
              stroke="rgba(244,238,231,0.12)"
              strokeWidth="11"
              strokeDasharray="50.6 6.3"
              strokeDashoffset="0"
            />
            <circle
              className="cb-gauge-arc"
              cx="64"
              cy="64"
              r="54"
              fill="none"
              stroke="#FF5A1F"
              strokeWidth="11"
              strokeLinecap="butt"
              strokeDasharray="50.6 290.7"
              strokeDashoffset="-113.5"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontWeight: 500,
                fontSize: 9,
                letterSpacing: '0.16em',
                color: 'rgba(244,238,231,0.52)',
                marginBottom: -2,
              }}
            >
              RANK
            </span>
            <span style={{ fontFamily: 'var(--sg)', fontWeight: 700, fontSize: 46, lineHeight: 1, color: '#FF5A1F' }}>
              3
            </span>
            <span
              style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 11, color: 'rgba(244,238,231,0.52)', marginTop: 1 }}
            >
              of 6
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontWeight: 500,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'rgba(244,238,231,0.52)',
              marginBottom: 6,
            }}
          >
            YOUR BID · ₹/MT
          </div>
          <div
            style={{
              fontFamily: 'var(--sg)',
              fontWeight: 700,
              fontSize: 27,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: '#F4EEE7',
            }}
          >
            ₹1,14,000
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 10,
              padding: '5px 9px',
              borderRadius: 6,
              background: 'rgba(255,176,32,0.1)',
              border: '1px solid rgba(255,176,32,0.28)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 9l-6 6-6-6" stroke="#FFB020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: 'var(--body)', fontWeight: 500, fontSize: 11, color: '#FFB020' }}>
              2 lower to lead
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="13" r="8" stroke="#FF5A1F" strokeWidth="1.7" />
              <path d="M12 9v4l2.5 2" stroke="#FF5A1F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 2.5h6" stroke="#FF5A1F" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span
              style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14, letterSpacing: '0.02em', color: '#F4EEE7' }}
            >
              {fmt(secs)}
            </span>
            <span
              style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 9, letterSpacing: '0.12em', color: 'rgba(244,238,231,0.3)' }}
            >
              TO CLOSE
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', margin: '0 18px', borderTop: '1px solid rgba(244,238,231,0.12)' }} />

      {/* The field */}
      <div style={{ position: 'relative', padding: '13px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
          <span
            style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(244,238,231,0.52)' }}
          >
            THE FIELD · 6 SELLERS
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--mono)',
              fontWeight: 500,
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'rgba(244,238,231,0.3)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="1.6" stroke="rgba(244,238,231,0.3)" strokeWidth="1.8" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="rgba(244,238,231,0.3)" strokeWidth="1.8" />
            </svg>
            RIVALS SEALED
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <SealedTile label="#1" />
          <SealedTile label="#2" />
          {/* YOU */}
          <div
            style={{
              flex: 1.05,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '9px 0',
              borderRadius: 7,
              background: 'rgba(255,90,31,0.13)',
              border: '1px solid #FF5A1F',
              boxShadow: '0 0 0 1px rgba(255,90,31,0.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.4" stroke="#FF5A1F" strokeWidth="1.8" />
              <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="#FF5A1F" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 11, color: '#FF5A1F' }}>YOU</span>
          </div>
          <SealedTile label="#4" />
          <SealedTile label="#5" />
          <SealedTile label="#6" />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 13,
            paddingTop: 12,
            borderTop: '1px solid rgba(244,238,231,0.12)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
            <path
              d="M12 3 5 6V11C5 15.5 8 19 12 21C16 19 19 15.5 19 11V6L12 3Z"
              stroke="#FFB020"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" stroke="#FFB020" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: 'var(--body)', fontWeight: 400, fontSize: 10.5, lineHeight: 1.45, color: 'rgba(244,238,231,0.52)' }}>
            Rivals&rsquo; prices and names stay sealed until close. You only ever see your own rank.
          </span>
        </div>
      </div>
    </div>
  );
}
