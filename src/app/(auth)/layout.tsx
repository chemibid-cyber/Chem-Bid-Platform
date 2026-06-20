/**
 * Auth shell — just the mineral-paper background, full height. Each screen owns
 * its own layout: login is a full-bleed split (fills the viewport); signup /
 * reset / forgot use <CenteredAuth> for a centred card. The footer lives with
 * each screen (see auth-footer / centered-auth) so login can run truly edge-to-edge.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
