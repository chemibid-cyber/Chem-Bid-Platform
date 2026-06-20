import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { SignupForm } from './signup-form';
import { CenteredAuth } from '../centered-auth';

export default async function SignupPage() {
  const current = await getCurrentUser();
  if (current) redirect('/dashboard');
  return (
    <CenteredAuth>
      <SignupForm />
    </CenteredAuth>
  );
}
