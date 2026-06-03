import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigured,
} from '@/lib/supabase/env';

/**
 * Refresh the Supabase session on every request so that Server
 * Components see a valid user. Without this, the session cookie can
 * silently expire and the user gets bounced to /login mid-session.
 *
 * Renamed from middleware.ts to proxy.ts to match Next.js 16's new
 * convention (see node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md).
 * The function name is `proxy` to match.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // If Supabase isn't configured yet, fall straight through. The site
  // is still using mock auth + JSON data in this state, and there's no
  // session to refresh.
  if (!supabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        // Mirror cookie writes onto both the request (so this proxy can
        // hand the refreshed cookies to downstream Server Components) and
        // the response (so the browser keeps them).
        for (const { name, value } of items) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of items) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // This call has the side effect of refreshing tokens that are close
  // to expiring. The Supabase SSR docs are explicit that you must call
  // this on every request — don't skip it as an "optimization."
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip static assets and the optimized image pipeline so we don't pay
  // the Supabase round-trip on every CSS/font/image fetch.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
