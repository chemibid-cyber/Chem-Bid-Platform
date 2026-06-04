import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and the PWA shell so the session
     * cookie stays fresh without touching every image request.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)',
  ],
};
