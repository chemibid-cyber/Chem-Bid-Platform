import { createBrowserClient } from '@supabase/ssr';

/** Browser-side Supabase client (used for Realtime rank subscriptions). */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are not set.');
  }
  return createBrowserClient(url, anon);
}
