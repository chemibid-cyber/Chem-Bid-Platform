import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS — SERVER ONLY, never import into client code.
 * Used for: GST verification writes, member invites (auth admin), cron jobs,
 * and operator actions. Every mutation through this client MUST call recordAudit().
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (server-only).');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
