'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const PUBLIC_PATHS = ['/login', '/signup'];

/**
 * Layout-level auth guard. When Supabase is configured, signed-out visitors
 * are sent to /login; everything else renders. When it is not configured
 * (local dev), the app runs in local-only mode and nothing is gated.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(!isSupabaseConfigured);
  // Remember a seen session so a mid-session sign-out can be named on
  // the login screen instead of silently bouncing the player there.
  const hadSession = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase()!;
    let active = true;
    const check = async () => {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      const signedIn = Boolean(data.session);
      if (signedIn) hadSession.current = true;
      if (!signedIn && !PUBLIC_PATHS.includes(pathname)) {
        router.replace(hadSession.current ? '/login?signedout=1' : '/login');
      } else if (signedIn && PUBLIC_PATHS.includes(pathname)) {
        router.replace('/');
      } else {
        setReady(true);
      }
    };
    void check();
    const { data: sub } = sb.auth.onAuthStateChange(() => void check());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4">
        <p className="text-[var(--ink-dim)]">Opening the case files…</p>
      </main>
    );
  }
  return <>{children}</>;
}
