import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { SignupForm } from './signup-form';

export default async function SignupPage() {
  const current = await getCurrentUser();
  if (current) redirect('/dashboard');
  return <SignupForm />;
}
