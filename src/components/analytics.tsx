import Script from 'next/script';

/**
 * Third-party front-end widgets, loaded once from the root layout so they run
 * on every page, via next/script (`afterInteractive` — off the critical path):
 *   - Microsoft Clarity — heatmaps + session replay (masks sensitive content by
 *     default, which fits our DPDP posture).
 *   - Tidio — live-chat widget.
 *
 * Both keys are PUBLIC (they ship in the page HTML either way), so the ChemiBid
 * production keys are baked in as defaults. A NEXT_PUBLIC_* env var overrides
 * the default when set (e.g. a separate Clarity project per environment), and
 * setting it to an empty string is NOT an override — the `??` only falls back on
 * undefined, so to truly disable a widget, change it here or pass a real value.
 *
 * Gated to production builds only, so localhost `npm run dev` sessions don't
 * land in Clarity recordings or wake the Tidio inbox. (Next inlines NODE_ENV at
 * build time, so the dev branch is dead-code-eliminated from the prod bundle.)
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? 'x6jr2l0x4m';
const TIDIO_KEY = process.env.NEXT_PUBLIC_TIDIO_KEY ?? 'sgx7ice0rvy70napbxpubgb1um36m5hy';
const ENABLED = process.env.NODE_ENV === 'production';

export function Analytics() {
  if (!ENABLED) return null;
  return (
    <>
      {CLARITY_ID ? (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      ) : null}
      {TIDIO_KEY ? (
        <Script src={`https://code.tidio.co/${TIDIO_KEY}.js`} strategy="afterInteractive" />
      ) : null}
    </>
  );
}
