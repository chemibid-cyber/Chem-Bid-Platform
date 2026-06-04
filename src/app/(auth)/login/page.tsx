import { redirect } from 'next/navigation';
import { getCurrentUser, getOperator } from '@/lib/auth/session';
import { LoginForm } from './login-form';

const ERROR_MESSAGES: Record<string, string> = {
  account_disabled: 'This account has been disabled. Contact your company Admin.',
  operator_only: 'That area is for platform operators.',
  auth_callback: 'That link is invalid or has expired. Try again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const current = await getCurrentUser();
  if (current) redirect('/dashboard');
  const operator = await getOperator();
  if (operator) redirect('/operator');

  const initialError = searchParams.error ? ERROR_MESSAGES[searchParams.error] : undefined;
  return <LoginForm initialError={initialError} />;
}
