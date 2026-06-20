import { AuthFooter } from './auth-footer';

/** Centred card layout for the non-login auth screens (signup / reset / forgot).
 *  Fills the viewport height so there's no awkward floating-in-grey. */
export function CenteredAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full">{children}</div>
      <AuthFooter className="mt-8 text-center" />
    </div>
  );
}
