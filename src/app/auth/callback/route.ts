import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Exchanges a Supabase auth `code` (recovery / invite / email confirm) for a
 * session, then forwards to `next`. Used by password-reset and member-invite links.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
