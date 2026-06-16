import Script from 'next/script';

/**
 * Third-party front-end widgets, each env-gated so it's completely inert until
 * its key is set (and disabled again by clearing the env var — no code change):
 *   - Microsoft Clarity — heatmaps + session replay.  NEXT_PUBLIC_CLARITY_ID
 *   - Tidio             — live-chat widget.            NEXT_PUBLIC_TIDIO_KEY
 *
 * Both are PUBLIC client-side keys (they ship in the page's HTML either way),
 * so they live in NEXT_PUBLIC_* vars, inlined at build time. Rendered once from
 * the root layout so they load on every page. `afterInteractive` keeps them off
 * the critical path — they load after the page is interactive, not blocking paint.
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const TIDIO_KEY = process.env.NEXT_PUBLIC_TIDIO_KEY;

export function Analytics() {
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
