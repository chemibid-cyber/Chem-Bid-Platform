import { ResetPasswordForm } from './reset-form';
import { CenteredAuth } from '../centered-auth';

/**
 * Server component: pulls the one-time `token_hash` (+ type) out of the reset link
 * URL and hands them to the client form as hidden fields. Verification is deferred
 * to form submit so email link-scanners can't consume the single-use token on load.
 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tokenHash = typeof searchParams.token_hash === 'string' ? searchParams.token_hash : '';
  const type = typeof searchParams.type === 'string' ? searchParams.type : 'recovery';

  return (
    <CenteredAuth>
      <ResetPasswordForm tokenHash={tokenHash} type={type} />
    </CenteredAuth>
  );
}
